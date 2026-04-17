# Certificates & Provisioning

**NUNCA** commite arquivos `.p12`, `.mobileprovision`, `.cer` ou chaves privadas aqui.

O EAS gerencia credenciais iOS automaticamente. Use esta pasta apenas para:

- Notas sobre qual conta Apple Developer está em uso
- Lista de devices registrados (UDIDs) para perfis ad-hoc
- Instruções de rotação de certificados
- Links para App Store Connect / developer.apple.com

## Comandos úteis

```bash
# Ver credenciais armazenadas no EAS
eas credentials

# Forçar o EAS a regenerar certificado + profile
eas credentials --platform ios
```
