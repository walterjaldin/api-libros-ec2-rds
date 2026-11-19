#!/usr/bin/env bash
# Aprovisiona la infraestructura del examen con AWS CLI (ejecutar en AWS CloudShell).
#   export ADMIN_PUBKEY="ssh-ed25519 ..."    # llave publica de administracion
#   export DEPLOY_PUBKEY="ssh-ed25519 ..."   # llave publica de GitHub Actions
#   bash aws-setup.sh
# La contrasena maestra de RDS la genera AWS y queda en Secrets Manager
# (--manage-master-user-password): nunca se escribe ni se muestra.
set -euo pipefail
: "${ADMIN_PUBKEY:?}" "${DEPLOY_PUBKEY:?}"

REPO="${REPO:-walterjaldin/api-libros-ec2-rds}"
P=api-libros
REGION="${AWS_REGION:-$(aws configure get region)}"
echo "Region: $REGION"

VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)
echo "VPC por defecto: $VPC"

# ---------- Security Groups ----------
EC2_SG=$(aws ec2 create-security-group --group-name ec2-libros-sg --vpc-id "$VPC" \
  --description "API Libros EC2: SSH (llaves), HTTP y HTTPS" --query GroupId --output text)
aws ec2 create-tags --resources "$EC2_SG" --tags Key=Name,Value=ec2-libros-sg
aws ec2 authorize-security-group-ingress --group-id "$EC2_SG" --ip-permissions \
  'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0,Description="SSH solo con llave (runners de GitHub Actions con IP dinamica)"}]' \
  'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description=HTTP}],Ipv6Ranges=[{CidrIpv6=::/0,Description=HTTP}]' \
  'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description=HTTPS}],Ipv6Ranges=[{CidrIpv6=::/0,Description=HTTPS}]' >/dev/null

RDS_SG=$(aws ec2 create-security-group --group-name rds-libros-sg --vpc-id "$VPC" \
  --description "API Libros RDS: MySQL solo desde ec2-libros-sg" --query GroupId --output text)
aws ec2 create-tags --resources "$RDS_SG" --tags Key=Name,Value=rds-libros-sg
aws ec2 authorize-security-group-ingress --group-id "$RDS_SG" --ip-permissions \
  "IpProtocol=tcp,FromPort=3306,ToPort=3306,UserIdGroupPairs=[{GroupId=$EC2_SG,Description=\"MySQL desde la EC2 de la API\"}]" >/dev/null
echo "SG EC2: $EC2_SG | SG RDS: $RDS_SG"

# ---------- RDS MySQL (privado) ----------
aws rds create-db-instance \
  --db-instance-identifier rds-libros \
  --engine mysql --engine-version 8.4 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-type gp3 \
  --master-username admin --manage-master-user-password \
  --db-name db_libros \
  --vpc-security-group-ids "$RDS_SG" \
  --no-publicly-accessible --no-multi-az \
  --backup-retention-period 1 \
  --tags Key=Project,Value=$P >/dev/null
echo "RDS rds-libros en creacion..."

SECRET_ARN=$(aws rds describe-db-instances --db-instance-identifier rds-libros --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)
echo "Secreto de la contrasena maestra: $SECRET_ARN"

# ---------- Rol IAM de la EC2 (solo puede leer ese secreto) ----------
aws iam create-role --role-name ec2-api-libros-role --assume-role-policy-document \
  '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
aws iam put-role-policy --role-name ec2-api-libros-role --policy-name leer-secreto-rds --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"secretsmanager:GetSecretValue\",\"Resource\":\"$SECRET_ARN\"}]}"
aws iam create-instance-profile --instance-profile-name ec2-api-libros-profile >/dev/null
aws iam add-role-to-instance-profile --instance-profile-name ec2-api-libros-profile --role-name ec2-api-libros-role
sleep 15 # propagacion de IAM

# ---------- EC2 ----------
aws ec2 import-key-pair --key-name admin-api-libros --public-key-material "$(echo -n "$ADMIN_PUBKEY" | base64 -w0)" >/dev/null
AMI=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id --query Parameter.Value --output text)
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/infra/user-data.sh" \
  | sed -e "s|__DEPLOY_PUBKEY__|$DEPLOY_PUBKEY|" -e "s|__REPO__|$REPO|" > /tmp/ud.sh
IID=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.micro \
  --key-name admin-api-libros --security-group-ids "$EC2_SG" \
  --iam-instance-profile Name=ec2-api-libros-profile \
  --user-data file:///tmp/ud.sh \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=12,VolumeType=gp3}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=ec2-api-libros},{Key=Project,Value=$P}]" \
  --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-running --instance-ids "$IID"

ALLOC=$(aws ec2 allocate-address --domain vpc --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=eip-api-libros}]" --query AllocationId --output text)
aws ec2 associate-address --instance-id "$IID" --allocation-id "$ALLOC" >/dev/null
EIP=$(aws ec2 describe-addresses --allocation-ids "$ALLOC" --query 'Addresses[0].PublicIp' --output text)
echo "EC2 $IID con Elastic IP $EIP"

echo "Esperando a que RDS este disponible (5-10 min)..."
aws rds wait db-instance-available --db-instance-identifier rds-libros
ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier rds-libros --query 'DBInstances[0].Endpoint.Address' --output text)

echo "================ RESUMEN ================"
echo "EC2_INSTANCE=$IID"
echo "ELASTIC_IP=$EIP"
echo "EC2_SG=$EC2_SG"
echo "RDS_SG=$RDS_SG"
echo "RDS_ENDPOINT=$ENDPOINT"
echo "RDS_SECRET_ARN=$SECRET_ARN"
