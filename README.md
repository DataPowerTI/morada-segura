# Morada Segura

Sistema independente de gestão para condomínios.

**Desenvolvido por Data Power Labs**

## Tecnologias

Este projeto utiliza:

- **Frontend**: Vite, React, TypeScript
- **Style**: Tailwind CSS, shadcn/ui
- **Backend/DB**: PocketBase

## Desenvolvimento Local

Para rodar o projeto localmente:

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o ambiente**:
   O projeto utiliza o PocketBase. Você pode rodar via Docker:
   ```bash
   docker-compose up -d
   ```

3. **Executar o frontend**:
   ```bash
   npm run dev
   ```

## VPS Deployment (Hostinger)

O projeto está pronto para ser hospedado em uma VPS. O PocketBase pode ser executado como um serviço ou container Docker, e o frontend (Vite) deve ser buildado:

```bash
npm run build
```

Os arquivos estáticos gerados em `dist` podem ser servidos pelo próprio PocketBase (pasta `pb_public`) ou por um servidor como Nginx.
