# 临时密钥授权语法
推荐采用临时密钥限制资源的方式，对 stage 进行授权，实现多用户安全开发[接口文档地址](https://cloud.tencent.com/document/product/1312/48195)
```
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "sls:RunComponent",
        "sls:GetInstance",
        "sls:ListInstances"
      ],
      "resource": [
        "qcs::sls:${region}:uin/${uin}:appname/${app}/stagename/${stage}"
      ]
    }
  ]
}
```
