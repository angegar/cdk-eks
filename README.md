https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ec2.Vpc.html


## Deploy cdktf stacks

```shell
npx cdktf deploy "*"
```

## Clean local kubeconfig

> Required only if you have previous installation

```shell
export CLUSTER='arn:aws:eks:eu-west-3:504566391182:cluster/sbx-laurentgil'
kubectl config delete-cluster $CLUSTER
kubectl config delete-context $CLUSTER
kubectl config delete-user $CLUSTER
```

## K8s authentication pre-requisites

Make sure to have follow this documentation to install the required tools :

https://manomano.atlassian.net/wiki/spaces/CORE/pages/2045968441/EKS+K8s+cluster+access+authentication#Developer-Experience

## Connect to the cluster

Once authenticated to aws cloud, execute the following command.

```shell
aws eks update-kubeconfig --region eu-west-3 --name sbx-laurentgil --profile manomano-sbx
```

## GitLab Kubernetes integration

GitLab is able to integrate with kubernetes however some requirements are required.

- create a dedicated service account
- grant the service account with cluster-admin permission

From the kubernetes folder, execute :

```shell
kubectl apply -f .
```

### Get token

Execute the following command to get the gitlab service account token: 

```shell
export TOKEN_NAME=$(kubectl get sa -n kube-system gitlab -o=jsonpath="{.secrets[0].name}")
kubectl get secrets $TOKEN_NAME -n kube-system -o=jsonpath={.data.token}| base64 -d
```

### Get client certificate

Execute the following command to get the gitlab service account certificate:

```shell
export TOKEN_NAME=$(kubectl get sa -n kube-system gitlab -o=jsonpath="{.secrets[0].name}")
kubectl get secrets $TOKEN_NAME -n kube-system -o=jsonpath={.data."ca\.crt"}| base64 -d
```

Execute the following command to get the cluster api URL :

```shell
kubectl cluster-info

export HELM_KUBEAPISERVER=
```

### Get server certificate authority 

```shell
kubectl config view --minify --raw --output 'jsonpath={..cluster.certificate-authority-data}' | base64 -d
````






