# Guia de Deploy e Instalação - Morada Segura 🚀

Este documento descreve como instalar, atualizar e manter o sistema **Morada Segura** em uma VPS Linux (Hostinger ou similar) utilizando **Docker**.

---

## 🏗️ Estrutura do Sistema
O sistema é dividido em dois containers principais:
1.  **`app` (Frontend)**: Roda um servidor Nginx servindo a interface React.
2.  **`pocketbase` (Backend/DB)**: Gerencia o banco de dados SQL, autenticação e arquivos.

---

## 🛠️ Pré-requisitos na VPS
Antes de começar, certifique-se de que sua VPS possui:
- **Docker** e **Docker Compose** instalados.
- **Git** para clonar o repositório.

---

## 📥 Instalação Inicial
Para subir o sistema pela primeira vez em um novo servidor:

1.  **Conecte-se via SSH**:
    ```bash
    ssh root@SEU_IP_DA_VPS
    ```

2.  **Clone o projeto**:
    ```bash
    cd /var/www
    git clone https://github.com/DataPowerTI/morada-segura
    cd morada-segura
    ```

3.  **Inicie os Containers**:
    ```bash
    docker compose up -d --build
    ```
    *Isso criará as imagens, baixará as dependências do Node e deixará o sistema online.*

4.  **Acesse o Sistema**:
    - **Frontend**: `http://SEU_IP:8080`
    - **PocketBase Admin**: `http://SEU_IP:8090/_/`

---

## 🔄 Como Atualizar o Sistema (Deploy)
Sempre que houver novos commits no GitHub, siga estes passos para atualizar a produção:

1.  **Entre na pasta do projeto**:
    ```bash
    cd /var/www/morada-segura
    ```

2.  **Puxe as novidades do Git**:
    ```bash
    git pull origin main
    ```

3.  **Reconstrua e Reinicie o Frontend**:
    ```bash
    docker compose up --build -d app
    ```
    *O Docker vai recompilar o código React internamente e atualizar as telas.*

4.  **Reinicie o Backend (se necessário)**:
    Se houver mudanças em `pb_hooks` ou `pb_migrations`, reinicie o PocketBase:
    ```bash
    docker restart pocketbase
    ```

---

## 📂 Pastas Críticas e Backup
O banco de dados do sistema NÃO fica dentro do Docker, ele fica na pasta real da sua VPS para segurança.

### O que você DEVE fazer backup:
-   **`/pb_data`**: Aqui estão todos os moradores, senhas, histórico e configurações do banco. Se você deletar essa pasta, o sistema ficará vazio.
-   **`/pb_migrations`**: Contém a estrutura das tabelas.
-   **`/pb_hooks`**: Contém a lógica de limpeza de fotos e validação do salão de festas.

**Comando de Backup Rápido**:
```bash
cp -r /var/www/morada-segura/pb_data /var/www/backup_morada_segura_$(date +%F)
```

### O que NÃO enviar do Windows para a VPS:
Ao gerenciar arquivos via FTP, **nunca** sobrescreva a pasta `pb_data` da VPS com a do seu computador, ou você apagará os dados reais de produção.

---

## 🔍 Comandos Úteis de Diagnóstico
-   **Ver se o sistema está rodando**: `docker ps`
-   **Ver erros do banco de dados**: `docker logs pocketbase`
-   **Ver erros do site**: `docker logs morada-segura-app`
-   **Parar tudo**: `docker compose down`

---

> [!IMPORTANT]
> O PocketBase executa as migrações (novos campos/tabelas) automaticamente sempre que o container é reiniciado e detecta novos arquivos na pasta `pb_migrations`.
