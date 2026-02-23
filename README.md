Supabase CLI **Edge Function 배포**

```bash
supabase functions deploy <function-name>
```

프로젝트 지정 (여러 프로젝트 사용할 때)
```bash
supabase functions deploy <function-name> --project-ref <project-ref>
```

배포 후 호출

```bash
supabase functions invoke <function-name> --project-ref <project-ref>
```
