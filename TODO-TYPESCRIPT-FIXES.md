# TypeScript fixes pendentes

O build do Vercel está com `typescript.ignoreBuildErrors: true` e `eslint.ignoreDuringBuilds: true` temporariamente para destravar o deploy.

Existem ~39 erros de tipagem que precisam ser corrigidos. Para listá-los:

```bash
npx tsc --noEmit
```

Antes de remover o `ignoreBuildErrors`, todos esses erros precisam estar zerados.

## Snapshot dos erros (capturado no momento do bypass)

```
next.config.ts(16,3): error TS2353: Object literal may only specify known properties, and 'eslint' does not exist in type 'NextConfig'.
src/actions/eventos.ts(57,22): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/actions/modalidades.ts(9,68): error TS2503: Cannot find namespace 'z'.
src/actions/notificacoes.ts(23,12): error TS2352: Conversion of type 'MockNotificacao[]' to type 'NotificacaoFila[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Property 'destinatario_telefone' is missing in type 'MockNotificacao' but required in type 'NotificacaoFila'.
src/actions/notificacoes.ts(47,12): error TS2352: Conversion of type 'MockNotificacao[]' to type 'NotificacaoFila[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Property 'destinatario_telefone' is missing in type 'MockNotificacao' but required in type 'NotificacaoFila'.
src/actions/senhas.ts(10,55): error TS2503: Cannot find namespace 'z'.
src/app/(admin)/admin/cobrancas/page.tsx(32,53): error TS2322: Type '{ children: Element; variant: "outline"; size: "sm"; asChild: true; }' is not assignable to type 'IntrinsicAttributes & ButtonProps & VariantProps<(props?: (ConfigVariants<{ variant: { default: string; outline: string; secondary: string; ghost: string; destructive: string; link: string; }; size: { ...; }; }> & ClassProp) | undefined) => string>'.
  Property 'asChild' does not exist on type 'IntrinsicAttributes & ButtonProps & VariantProps<(props?: (ConfigVariants<{ variant: { default: string; outline: string; secondary: string; ghost: string; destructive: string; link: string; }; size: { ...; }; }> & ClassProp) | undefined) => string>'.
src/app/(tenant)/equipe/page.tsx(19,27): error TS7006: Parameter 'u' implicitly has an 'any' type.
src/app/(tenant)/eventos/[id]/modalidades/page.tsx(16,27): error TS7006: Parameter 'm' implicitly has an 'any' type.
src/app/(tenant)/eventos/page.tsx(27,29): error TS7006: Parameter 'evento' implicitly has an 'any' type.
src/app/(tenant)/financeiro/page.tsx(65,28): error TS7006: Parameter 's' implicitly has an 'any' type.
src/app/(tenant)/financeiro/page.tsx(75,49): error TS2322: Type '{ children: Element; variant: "outline"; size: "sm"; asChild: true; }' is not assignable to type 'IntrinsicAttributes & ButtonProps & VariantProps<(props?: (ConfigVariants<{ variant: { default: string; outline: string; secondary: string; ghost: string; destructive: string; link: string; }; size: { ...; }; }> & ClassProp) | undefined) => string>'.
  Property 'asChild' does not exist on type 'IntrinsicAttributes & ButtonProps & VariantProps<(props?: (ConfigVariants<{ variant: { default: string; outline: string; secondary: string; ghost: string; destructive: string; link: string; }; size: { ...; }; }> & ClassProp) | undefined) => string>'.
src/app/evento/[id]/inscricao/page.tsx(44,39): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'SetStateAction<string | null>'.
  Type 'undefined' is not assignable to type 'SetStateAction<string | null>'.
src/components/competidores/competidor-form.tsx(34,22): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'SetStateAction<string | null>'.
  Type 'undefined' is not assignable to type 'SetStateAction<string | null>'.
src/components/eventos/evento-form.tsx(38,22): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'SetStateAction<string | null>'.
  Type 'undefined' is not assignable to type 'SetStateAction<string | null>'.
src/components/eventos/modalidade-form.tsx(29,45): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'SetStateAction<string | null>'.
  Type 'undefined' is not assignable to type 'SetStateAction<string | null>'.
src/components/senhas/caixa-form.tsx(42,39): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'SetStateAction<string | null>'.
  Type 'undefined' is not assignable to type 'SetStateAction<string | null>'.
src/lib/auth/get-session.ts(19,63): error TS2339: Property 'role' does not exist on type '{} | UserMetadata'.
  Property 'role' does not exist on type '{}'.
src/lib/auth/get-session.ts(20,72): error TS2339: Property 'tenant_id' does not exist on type '{} | UserMetadata'.
  Property 'tenant_id' does not exist on type '{}'.
src/lib/pdf/render-to-buffer.ts(5,42): error TS2345: Argument of type 'ReactElement<unknown, string | JSXElementConstructor<any>>' is not assignable to parameter of type 'ReactElement<DocumentProps, string | JSXElementConstructor<any>>'.
  Type 'unknown' is not assignable to type 'DocumentProps'.
src/lib/realtime/hooks.ts(17,16): error TS7031: Binding element 'data' implicitly has an 'any' type.
src/lib/realtime/hooks.ts(34,20): error TS7031: Binding element 'data' implicitly has an 'any' type.
src/lib/realtime/hooks.ts(57,16): error TS7031: Binding element 'data' implicitly has an 'any' type.
src/lib/realtime/hooks.ts(74,20): error TS7031: Binding element 'data' implicitly has an 'any' type.
supabase/functions/process-notifications/index.ts(1,30): error TS2307: Cannot find module 'https://esm.sh/@supabase/supabase-js@2' or its corresponding type declarations.
supabase/functions/process-notifications/index.ts(2,37): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
supabase/functions/process-notifications/index.ts(3,46): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
supabase/functions/process-notifications/index.ts(17,1): error TS2304: Cannot find name 'Deno'.
supabase/functions/process-notifications/index.ts(20,26): error TS2304: Cannot find name 'Deno'.
supabase/functions/process-notifications/index.ts(26,5): error TS2304: Cannot find name 'Deno'.
supabase/functions/process-notifications/index.ts(27,5): error TS2304: Cannot find name 'Deno'.
supabase/functions/process-notifications/index.ts(30,18): error TS2304: Cannot find name 'Deno'.
supabase/functions/process-notifications/index.ts(31,18): error TS2304: Cannot find name 'Deno'.
supabase/functions/process-notifications/index.ts(57,27): error TS2339: Property 'status' does not exist on type 'Notificacao'.
tests/unit/actions/eventos.test.ts(2,10): error TS2459: Module '"@/actions/eventos"' declares 'eventoSchema' locally, but it is not exported.
tests/unit/actions/eventos.test.ts(2,24): error TS2459: Module '"@/actions/eventos"' declares 'validateEventoTransition' locally, but it is not exported.
tests/unit/actions/modalidades.test.ts(2,10): error TS2459: Module '"@/actions/modalidades"' declares 'modalidadeSchema' locally, but it is not exported.
tests/unit/actions/senhas.test.ts(2,10): error TS2459: Module '"@/actions/senhas"' declares 'vendaSchema' locally, but it is not exported.
tests/unit/financeiro.test.ts(2,10): error TS2459: Module '"@/actions/financeiro"' declares 'calcularResumoDeTransacoes' locally, but it is not exported.
tests/unit/financeiro.test.ts(3,15): error TS2459: Module '"@/actions/financeiro"' declares 'FinanceiroTransacao' locally, but it is not exported.
```