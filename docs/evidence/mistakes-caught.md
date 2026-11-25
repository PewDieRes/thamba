| What                                                                                                                            | How caught | Fix link                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------- |
| The boundary command excluded colocated use case tests that imported dependencies outside the application layer.                | review     | https://github.com/PewDieRes/thamba/pull/40 |
| The in-memory transaction factory constructed repository adapters outside the designated container.                             | review     | https://github.com/PewDieRes/thamba/pull/40 |
| The Supabase container generated a new invite token signing secret per instance, making replayed Driver invite tokens unusable. | review     | TODO                                        |
| The Rider display mapper suppressed configured Stand Coordinator phone numbers, violating dispatch invariant I11.               | review     | TODO                                        |
