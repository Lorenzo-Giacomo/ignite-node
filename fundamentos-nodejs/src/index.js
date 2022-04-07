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

function getBalance(statement) {
  // operação reduce pega as infos de determinado valor e transformará em um único valor. Fará o cálculo de tudo aquilo q entrou menos aquilo q saiu. Operation é o objeto q queremos iterar.
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount
    } else {
      return acc - operation.amount
    }
  }, 0)

  return balance
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
app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body
  const { customer } = request

  /* criar função que só permite fazer um saque caso o valor sacado seja menor do q o total da conta. Percorrer pelo array de statemaents e somar todos os amounts para descobrir o total. Se o tipo de operação do statement for 'withdraw'. Criar função externa.
   */

  const balance = getBalance(customer.statement)

  if (balance < amount) {
    return response.status(400).json({ error: 'Insufficient funds!' })
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit'
  }

  customer.statement.push(statementOperation)
  return response.status(201).send()
})

// buscar extrato por data
app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request
  const { date } = request.query

  // transforma a data fornecida
  const dateFormat = new Date(date + ' 00:00')

  // percorrer a lista de statements e filtrar pela data e filtrar transformando a data e colocar em string exatamente como digitado
  const statement = customer.statement.filter(
    statement =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  )

  return response.json(statement)
})

// atualizar dados do cliente
app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body
  const { customer } = request

  customer.name = name

  return response.status(201).send()
})
// pegar dados de todos os clientes
app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request

  return response.json(customer)
})

// excluir dados de um cliente que passamos no header
app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request

  // precisamos apagar da lista de customers somente aquele q queremos. Splice() exclui elementos dentro de um array
  customers.splice(customer, 1)

  return response.json(customers)
})

// pegar balanço de cada usuário
app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request

  const balance = getBalance(customer.statement)

  return response.json(balance)
})

app.listen(3333)
