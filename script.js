// 1. Estado da Aplicação e Mapeamento do DOM
const form = document.querySelector('#form-lancamento');
const inputDescricao = document.querySelector('#descricao');
const inputValor = document.querySelector('#valor');
const selectTipo = document.querySelector('#tipo');
const selectCategoria = document.querySelector('#categoria');
const inputData = document.querySelector('#data');

const btnSubmit = document.querySelector('#btn-submit');
const btnCancelar = document.querySelector('#btn-cancelar');
const listaUl = document.querySelector('#lista-lancamentos');
const spanTotalItens = document.querySelector('#total-itens');
const spanValorTotal = document.querySelector('#valor-total');
const botoesFiltro = document.querySelectorAll('.filtros button[data-filtro]');
const btnOrdenar = document.querySelector('#btn-ordenar');

// Elementos adicionados para Tema e Filtros
const btnTema = document.querySelector('#btn-tema');
const filtroAno = document.querySelector('#filtro-ano');
const filtroMes = document.querySelector('#filtro-mes');
const filtroCategoria = document.querySelector('#filtro-categoria');

// Mapeamento de Categorias para Ícones
const iconesCategorias = {
  alimentacao: 'fa-utensils',
  transporte: 'fa-car',
  moradia: 'fa-house',
  salario: 'fa-money-bill-wave',
  lazer: 'fa-gamepad',
  outros: 'fa-box'
};

// Define a data atual como padrão no input
inputData.valueAsDate = new Date();

let lancamentos = JSON.parse(localStorage.getItem('lancamentos_db')) || [];
let filtroTipo = 'todos';
let idEmEdicao = null;
let meuGrafico = null;

// Função para atualizar as opções do select de Ano dinamicamente
const atualizarOpcoesAno = () => {
  const anoSelecionadoAnteriormente = filtroAno.value;
  
  // Extrai todos os anos únicos cadastrados nos lançamentos
  const anosDisponiveis = [...new Set(lancamentos.map(item => item.data.split('-')[0]))]
    .sort((a, b) => b - a); // Ordena do mais recente para o mais antigo

  // Reseta o select mantendo a opção "Todos os Anos"
  filtroAno.innerHTML = '<option value="todos">Todos os Anos</option>';

  anosDisponiveis.forEach(ano => {
    const option = document.createElement('option');
    option.value = ano;
    option.textContent = ano;
    filtroAno.appendChild(option);
  });

  // Mantém a seleção anterior caso ela ainda exista
  if (anosDisponiveis.includes(anoSelecionadoAnteriormente)) {
    filtroAno.value = anoSelecionadoAnteriormente;
  } else {
    filtroAno.value = 'todos';
  }
};

// Helper para obter itens filtrados
const obterItensFiltrados = () => {
  return lancamentos.filter(item => {
    const [anoItem, mesItem] = item.data.split('-');

    // Filtro por tipo (todos, receita, despesa)
    if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) {
      return false;
    }

    // Filtro por categoria
    if (filtroCategoria.value !== 'todas' && item.categoria !== filtroCategoria.value) {
      return false;
    }

    // Filtro por ano
    if (filtroAno.value !== 'todos' && anoItem !== filtroAno.value) {
      return false;
    }

    // Filtro por mês
    if (filtroMes.value !== 'todos' && mesItem !== filtroMes.value) {
      return false;
    }

    return true;
  });
};

// 2. Salvar no localStorage
const salvarStorage = () => {
  localStorage.setItem('lancamentos_db', JSON.stringify(lancamentos));
};

// Helper para formatar a data (YYYY-MM-DD -> DD/MM/AAAA)
const formatarData = (dataIso) => {
  if (!dataIso) return '';
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
};

// 3. Renderizar Lista na Tela
const renderizar = () => {
  atualizarOpcoesAno();
  listaUl.innerHTML = '';

  const itensFiltrados = obterItensFiltrados();

  itensFiltrados.forEach((item) => {
    const li = document.createElement('li');
    li.classList.add(item.tipo);
    
    const iconeClass = iconesCategorias[item.categoria] || 'fa-tag';

    li.innerHTML = `
      <div class="item-info">
        <i class="fa-solid ${iconeClass} icone-categoria"></i>
        <div>
          <strong>${item.descricao}</strong>
          <small>${formatarData(item.data)} • R$ ${item.valor.toFixed(2)}</small>
        </div>
      </div>
      <div class="acoes">
        <button class="btn-editar" onclick="prepararEdicao(${item.id})">Editar</button>
        <button class="btn-deletar" onclick="removerItem(${item.id})">X</button>
      </div>
    `;

    listaUl.appendChild(li);
  });

  atualizarResumo(itensFiltrados);
  atualizarGrafico(itensFiltrados);
};

// 4. Calcular Totais e Resumo
const atualizarResumo = (itens) => {
  spanTotalItens.textContent = itens.length;

  const valorCalculado = itens.reduce((acumulador, item) => {
    return item.tipo === 'receita' 
      ? acumulador + item.valor 
      : acumulador - item.valor;
  }, 0);

  spanValorTotal.textContent = valorCalculado.toFixed(2);
};

// 5. Inicializar e Atualizar Gráfico (Chart.js)
const atualizarGrafico = (itens) => {
  const totalReceitas = itens
    .filter(i => i.tipo === 'receita')
    .reduce((acc, i) => acc + i.valor, 0);

  const totalDespesas = itens
    .filter(i => i.tipo === 'despesa')
    .reduce((acc, i) => acc + i.valor, 0);

  const ctx = document.getElementById('grafico-saldo').getContext('2d');

  if (meuGrafico) {
    meuGrafico.destroy();
  }

  const isDarkMode = document.body.classList.contains('dark-mode');

  meuGrafico = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Receitas', 'Despesas'],
      datasets: [{
        data: [totalReceitas, totalDespesas],
        backgroundColor: ['#2ecc71', '#e74c3c'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDarkMode ? '#ffffff' : '#333333'
          }
        }
      }
    }
  });
};

// 6. Adicionar ou Atualizar Lançamento
form.addEventListener('submit', (event) => {
  event.preventDefault();

  const valorNum = parseFloat(inputValor.value);

  if (isNaN(valorNum) || valorNum <= 0) {
    alert('Por favor, informe um valor maior que zero (0).');
    return;
  }

  if (idEmEdicao !== null) {
    lancamentos = lancamentos.map(item => {
      if (item.id === idEmEdicao) {
        return {
          ...item,
          descricao: inputDescricao.value,
          valor: valorNum,
          tipo: selectTipo.value,
          categoria: selectCategoria.value,
          data: inputData.value
        };
      }
      return item;
    });
    limparEdicao();
  } else {
    const novoLancamento = {
      id: Date.now(),
      descricao: inputDescricao.value,
      valor: valorNum,
      tipo: selectTipo.value,
      categoria: selectCategoria.value,
      data: inputData.value
    };
    lancamentos = [...lancamentos, novoLancamento];
  }

  salvarStorage();
  renderizar();

  form.reset();
  inputData.valueAsDate = new Date();
  inputDescricao.focus();
});

// 7. Preparar Edição
window.prepararEdicao = (id) => {
  const item = lancamentos.find(l => l.id === id);
  if (!item) return;

  inputDescricao.value = item.descricao;
  inputValor.value = item.valor;
  selectTipo.value = item.tipo;
  selectCategoria.value = item.categoria || 'outros';
  inputData.value = item.data || new Date().toISOString().split('T')[0];

  idEmEdicao = id;
  btnSubmit.textContent = 'Salvar Alteração';
  btnCancelar.style.display = 'block';
  inputDescricao.focus();
};

const limparEdicao = () => {
  idEmEdicao = null;
  btnSubmit.textContent = 'Adicionar';
  btnCancelar.style.display = 'none';
  form.reset();
  inputData.valueAsDate = new Date();
};

btnCancelar.addEventListener('click', limparEdicao);

// 8. Ordenar por Maior Valor
btnOrdenar.addEventListener('click', () => {
  lancamentos.sort((a, b) => b.valor - a.valor);
  salvarStorage();
  renderizar();
});

// 9. Remover Item
window.removerItem = (id) => {
  if (idEmEdicao === id) {
    limparEdicao();
  }

  lancamentos = lancamentos.filter(item => item.id !== id);
  salvarStorage();
  renderizar();
};

// 10. Escutadores de Evento para Filtros
botoesFiltro.forEach(botao => {
  botao.addEventListener('click', (e) => {
    filtroTipo = e.target.dataset.filtro;
    renderizar();
  });
});

filtroAno.addEventListener('change', renderizar);
filtroMes.addEventListener('change', renderizar);
filtroCategoria.addEventListener('change', renderizar);

// 11. Alternar Modo Noturno
const alternarTema = () => {
  document.body.classList.toggle('dark-mode');
  const estaModoEscuro = document.body.classList.contains('dark-mode');

  localStorage.setItem('tema_dark', estaModoEscuro);

  const icone = btnTema.querySelector('i');
  if (estaModoEscuro) {
    icone.classList.replace('fa-moon', 'fa-sun');
  } else {
    icone.classList.replace('fa-sun', 'fa-moon');
  }

  renderizar();
};

btnTema.addEventListener('click', alternarTema);

// Carregar preferência de tema
if (localStorage.getItem('tema_dark') === 'true') {
  document.body.classList.add('dark-mode');
  btnTema.querySelector('i').classList.replace('fa-moon', 'fa-sun');
}

// Inicialização
renderizar();