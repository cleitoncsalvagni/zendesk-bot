# Zendesk Articles Integration

Este projeto consiste em uma integração com o Zendesk Help Center para buscar, sincronizar e pesquisar artigos usando IA para encontrar respostas relevantes.

## 📋 Estrutura do Projeto

```
.
├── client/                 # Frontend da aplicação
│   ├── index.html         # Página principal
│   ├── script.js          # Lógica do frontend
│   └── style.css          # Estilos
├── server/                # Backend da aplicação
│   ├── src/
│   │   ├── config/       # Configurações (Cohere, etc)
│   │   ├── controllers/  # Controladores da API
│   │   ├── services/     # Serviços de negócio
│   │   ├── data/         # Armazenamento de artigos
│   │   └── types/        # Tipos TypeScript
│   ├── package.json
│   └── tsconfig.json
└── zendesk-sync/         # Script de sincronização
    ├── get-articles.py   # Script Python para buscar artigos
    └── requirements.txt  # Dependências Python
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js (v16 ou superior)
- Python 3.x
- npm ou yarn
- Um ambiente virtual Python (recomendado)

### Configuração Inicial

1. **Configurar o Backend**

   ```bash
   cd server
   npm install
   ```

2. **Configurar o ambiente Python**

   ```bash
   cd zendesk-sync
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configurar variáveis de ambiente**

   Crie um arquivo `.env` na pasta `server` com as seguintes variáveis:

   ```env
   COHERE_API_KEY=sua_chave_api_cohere
   PORT=3000
   ```

### Executando a Aplicação

1. **Iniciar o Backend**

   ```bash
   cd server
   npm run dev
   ```

2. **Executar o Frontend**
   ```bash
   cd client
   # Use qualquer servidor HTTP estático, por exemplo:
   python3 -m http.server 8000
   ```

## 🔍 API Endpoints

### Busca de Artigos

- **POST** `/api/articles/search`
  - Busca artigos similares com base em uma consulta
  - Body:
    ```json
    {
      "query": "string"
    }
    ```
  - Resposta:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "number",
          "title": "string",
          "body": "string",
          "link": "string",
          "similarity": "number"
        }
      ]
    }
    ```

### Sincronização de Artigos

- **POST** `/api/articles/sync`
  - Sincroniza artigos com o Zendesk Help Center
  - Resposta:
    ```json
    {
      "success": true,
      "message": "Articles updated successfully" | "No updates needed"
    }
    ```

## 🔧 Especificações Técnicas

### Backend (Node.js + TypeScript)

- Framework: Express.js
- Processamento de Linguagem Natural: Cohere
- Armazenamento: Sistema de arquivos (JSON)
- Tipagem: TypeScript

### Script de Sincronização (Python)

- Biblioteca HTTP: requests
- Parser HTML: BeautifulSoup4
- Paginação dinâmica (100 artigos por página)
- Detecção automática de mudanças

### Recursos

- Busca semântica de artigos usando IA
- Sincronização automática com Zendesk
- Limpeza de HTML e formatação de texto
- Cache de embeddings para performance
- Sistema de comparação para detectar mudanças

### Características da Sincronização

- Busca incremental (apenas atualiza quando há mudanças)
- Suporte a paginação dinâmica
- Processamento de HTML para texto limpo
- Detecção de mudanças em:
  - Novos artigos
  - Artigos removidos
  - Mudanças em conteúdo existente

## 📝 Notas de Desenvolvimento

### Ambiente de Desenvolvimento

- Use `npm run dev` para executar em modo de desenvolvimento
- O servidor reinicia automaticamente quando há mudanças
- Logs detalhados de sincronização e busca
