# Retenção de fotos

O PocketBase executa a limpeza diariamente à meia-noite no fuso horário do servidor.

| Fotos | Prazo | Data de referência |
| --- | --- | --- |
| Encomendas (`parcels`) | 30 dias | Chegada (`arrived_at`), inclusive encomendas pendentes |
| Cadastro de pessoas (`people`) | 7 dias | Última atualização (`updated`), como na regra anterior |
| Visitantes, prestadores e hóspedes | 7 dias | Criação do registro (`created`), como na regra anterior |

Somente fotos com data de referência anterior ao respectivo limite são removidas. Os registros, dados cadastrais e histórico permanecem. Todas as fotos da encomenda são removidas juntas.

A limpeza salva os registros pela API interna do PocketBase, que também remove os arquivos associados. A consulta SQL direta usada anteriormente apenas limpava o campo; arquivos já órfãos não são recuperados por esta alteração.

O prazo do cadastro de pessoas continua sendo renovado quando o cadastro é atualizado, inclusive por uma nova visita sem troca da foto. As cópias nos registros de entrada seguem o prazo individual de criação.

## Atualização do servidor

Após integrar a alteração e atualizar o código na VPS, reinicie o backend:

```bash
docker restart pocketbase
```

A primeira execução agendada já alcança fotos de encomendas existentes com mais de 30 dias e de pessoas com mais de 7 dias. Não há exclusão imediata durante a implantação. A nova regra só entra em vigor após atualizar e reiniciar o backend.

A função legada `supabase/functions/cleanup-old-photos` também passa de 60 para 30 dias para encomendas. Ela só se aplica às instalações que ainda usam Supabase e exige publicação separada da função nesse ambiente.

## Verificação local

```bash
node --test tests/photo-retention.test.cjs
```

Os testes usam registros simulados para validar limites de data, paginação e falhas. A exclusão física deve ser validada em uma instância de teste do PocketBase antes da implantação.
