import express from "express";
import cors from "cors";
import abrirConexao from "./db.js";
import "dotenv/config";

const app = express();

app.use(express.json());
app.use(express.static("./"));
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const conexao = abrirConexao();

function formatarDataParaBD(dataStr) {
  if (!dataStr) return null;
  if (dataStr.includes("-")) return dataStr; // Já está em YYYY-MM-DD

  const [dia, mes, ano] = dataStr.split("/");
  return `${ano}-${mes}-${dia}`;
}

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

// GET - Listar todas as tarefas
app.get("/tarefas", async (req, res) => {
  try {
    const sql = "SELECT * FROM tarefas";
    const resp = await conexao.query(sql);
    res.json(resp);
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro ao buscar as tarefas" });
  }
});

// GET - Listar por Periodo
app.get("/tarefas/periodo", async (req, res) => {
  try {
    const sql = "SELECT * FROM tarefas ORDER BY data_tarefa ASC"; //ASC - Garante a ordem cronologica da menso recente até a masi recente
    const resp = await conexao.query(sql);

    res.json(resp);
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro ao buscar as tarefas" });
  }
});

// GET - Listar tarefa por id
app.get("/tarefas/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const sql = "SELECT * FROM tarefas WHERE id_tarefa = ?";
    const resp = await conexao.query(sql, [id]);

    if (resp.length === 0) {
      return res.status(404).json({ erro: "Tarefa não encontrada" });
    }
    res.json(resp[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro ao buscar as tarefas" });
  }
});

// POST - Cadastrar tarefa
app.post("/cadastro", async (req, res) => {
  const { nome, descricao, responsavel, data_tarefa, tarefa_concluida } =
    req.body;

  if (
    !nome ||
    !descricao ||
    !responsavel ||
    !data_tarefa ||
    tarefa_concluida === undefined
  ) {
    return res
      .status(400)
      .json({ erro: "Todos os campos da tarefa são obrigatórios" });
  }

  const dataFormatada = formatarDataParaBD(data_tarefa);

  let com;
  try {
    com = await conexao.getConnection();

    const result = await com.query(
      "INSERT INTO tarefas (nome, descricao, responsavel, data_tarefa, tarefa_concluida) VALUES (?, ?, ?, ?, ?)",
      [nome, descricao, responsavel, dataFormatada, tarefa_concluida],
    );

    res.status(201).json({
      mensagem: "Tarefa adicionada com sucesso!",
      id_inserido: Number(result.insertId),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro interno no servidor ao cadastrar" });
  } finally {
    if (com) com.release();
  }
});

// PUT - Atualizar tarefa por ID
app.put("/tarefa/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, descricao, responsavel, data_tarefa, tarefa_concluida } =
    req.body;
  const dataFormatada = formatarDataParaBD(data_tarefa);

  const sql =
    "UPDATE tarefas SET nome = ?, descricao = ?, responsavel = ?, data_tarefa = ?, tarefa_concluida = ? WHERE id_tarefa = ?";

  try {
    const resp = await conexao.query(sql, [
      nome,
      descricao,
      responsavel,
      dataFormatada,
      tarefa_concluida,
      id,
    ]);
    if (resp.affectedRows > 0) {
      res.json({ mensagem: "Tarefa atualizada com sucesso" });
    } else {
      res.status(404).json({ erro: "Tarefa não encontrada" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro interno no servidor ao atualizar" });
  }
});

// DELETE - Deletar tarefa por ID
app.delete("/tarefa/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const sql = "DELETE FROM tarefas WHERE id_tarefa = ?";
    const resp = await conexao.query(sql, [id]);

    if (resp.affectedRows === 0) {
      return res.status(404).json({ erro: "O ID inserido não existe" });
    }

    res.status(200).json({ mensagem: "Tarefa deletada com sucesso!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro interno no servidor ao deletar" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
