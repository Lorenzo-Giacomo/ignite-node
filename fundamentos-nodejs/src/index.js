const { request } = require('express')
const { response } = require('express')
const express = require('express')
const { v4: uuidv4 } = require('uuid')
// versão q gera ids randomicos

const app = express()

app.use(express.json())

// banco de dados fake
const customers = []

// Middleware
// next define se o md vai prosseguir com sua operção ou se vai parar. Quando acesso uma rota, vai pro md e se der um next, ele prossegue para oq está dentro dos métodos
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers

  // find para retornar a informação completa. Busca na lista de customers(que depois será substituido por um bd) e retorna aquele que tem o cpf igual ao do parametro
  const customer = customers.find(customer => customer.cpf === cpf)

  if (!customer) {
    return response.status(400).json({ error: 'Customer not found ' })
  }

  request.customer = customer
  // quando a condição não for atendida, segue para o código
  return next()
}

/*
Dados que uma conta terá:
cpf - string
name - string
id - uuid
statement [] Extratos, lançamentos
*/
//criar uma conta, pensar em quais informações receberemos
app.post('/account', (request, response) => {
  const { cpf, name } = request.body

  //some() retorna true ou false caso seja atendida a condição indicada
  const customerAlredyExists = customers.some(customer => customer.cpf === cpf)

  if (customerAlredyExists) {
    return response.status(400).json({ error: 'Customer alredy exists!' })
  }
  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  })

  return response.status(201).send()
})

// usamos o app.use caso abaixo necessitem o md
// app.use(verifyIfExistsAccountCPF)

// deve ser possível buscar o extrato bancário do cliente validado
app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request
  return response.json(customer.statement)
})

// realizar depósito
app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  // pensar em quais informações serão recebidas
  const { description, amount } = request.body
  // agora precisamos inserir essas informações dentro do statement do usuario

  const { customer } = request

  // precisamos definir como será cadastrado as informações dentro do array de statement
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }

  // customer veio dentro do md
  customer.statement.push(statementOperation)

  return response.status(201).send()
})

// realizar saque
app.post('/', verifyIfExistsAccountCPF, (request, response) => {})

app.listen(3333)
