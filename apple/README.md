# Apple / iOS — Configuração do CriaHub Mobile

Esta pasta concentra tudo que é específico da versão iPhone do app. O objetivo desta branch (`apple`) é estabilizar primeiro a experiência iOS antes de voltar a tratar Android em paridade.

## Estrutura

```
apple/
├── config/          # Overrides e snippets de app.config.ts, Info.plist, entitlements
├── assets/          # Ícones, splash, App Store screenshots (1290x2796, 2048x2732, etc.)
├── docs/            # Checklists de submissão, App Store Connect, TestFlight, review notes
└── certificates/    # Referências e instruções (NUNCA commitar .p12/.mobileprovision reais)
```

## Escopo desta branch

- Build e distribuição iOS (EAS Build profile `production` → AAB não, IPA sim)
- App Store Connect: metadata, screenshots, privacy nutrition labels, age rating
- TestFlight: grupos internos/externos
- Compliance: LGPD + App Store 5.1.1(v) (exclusão in-app), ITSAppUsesNonExemptEncryption
- Capabilities iOS: Push (se aplicável), Sign in with Apple (se exigido pela review), Associated Domains
- Ícone adaptativo iOS, launch screen, dark mode splash

## Fora de escopo

- Qualquer mudança que afete o build Android neste momento
- Refactor de código de features — só configuração e assets

## Referências

- `app.config.ts` — config dinâmica, atualmente contempla iOS + Android
- `eas.json` — profiles `preview` (iOS simulator) e `production` (loja)
- Bundle ID: `com.criahub.mobile`
- EAS project ID: `4069d525-bbce-4f86-9863-a51ccfe4af32`
