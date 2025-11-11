

> AVISO: Este diretório é uma cópia. 
Para desenvolver e executar a aplicação, utilize o README do diretório raiz e rode os comandos a partir de `pasta do seu projeto`.



## Centralização do Projeto

- Todo o desenvolvimento e execução ficam centralizados neste diretório raiz.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

git clone <(https://github.com/domingues497/stockplant)>

cd <nome_do_projeto>

# Instalar as dep. do projeto.
npm i

# Rodar o server a porta padrão é 5174.(pode ser mudada no vite.config.ts) 

npm run dev
caso mude a porta favor adicionar no gitignore

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS


## Arquitetura de Dados (PostgreSql)

Este projeto utiliza para autenticação SimpleJWT, banco de dados e regras de segurança (RLS). Para executar localmente:

1. Configure as variáveis no `.env` do frontend:
DB_CONFIG = {
    "host": "192.168.0.XXX",
    "port": 5432,
    "dbname": "Nome da Base",
    "user": "Usuario da base",
    "password": "xxxxxxx"
}

2. Certifique-se de aplicar as migrações do diretório `migrations`..
3. Inicie o frontend com `npm run dev` (porta padrão `5174`).

Os scripts sobreescrevem o arquivo `src/integrations/supabase/types.ts`.
