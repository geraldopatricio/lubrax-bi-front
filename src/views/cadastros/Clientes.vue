<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, Plus, Edit2, CheckCircle, AlertTriangle, X, Activity, Trash2, Eye, 
  Calendar, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, User, Phone, 
  MapPin, Car, Hash, Shield, Info, Mail, CreditCard, Clock
} from 'lucide-vue-next';

// === ESTADOS (REATIVIDADE) ===
const clientes = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

// === ESTADOS DE ORDENAÇÃO ===
const sortKey = ref('nome'); 
const sortOrder = ref('asc'); 

// === ESTADOS DE PAGINAÇÃO ===
const currentPage = ref(1);
const itemsPerPage = 10;

// === LÓGICA DE FILTRAGEM E ORDENAÇÃO ===
const sortedAndFilteredClientes = computed(() => {
  const term = searchQuery.value.toLowerCase();
  
  // 1. Filtro de Busca Global
  let filtered = clientes.value.filter(c => {
    const placa = c.carros?.[0]?.placa || '';
    return (
      (c.nome || '').toLowerCase().includes(term) ||
      (c.telefone || '').toLowerCase().includes(term) ||
      (c.cpf || '').toLowerCase().includes(term) ||
      (placa || '').toLowerCase().includes(term) ||
      (c.owner || '').toLowerCase().includes(term)
    );
  });

  // 2. Ordenação
  return filtered.sort((a, b) => {
    let modifier = sortOrder.value === 'asc' ? 1 : -1;
    let valA = a[sortKey.value] || '';
    let valB = b[sortKey.value] || '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return -1 * modifier;
    if (valA > valB) return 1 * modifier;
    return 0;
  });
});

const totalPages = computed(() => {
  return Math.ceil(sortedAndFilteredClientes.value.length / itemsPerPage) || 1;
});

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return sortedAndFilteredClientes.value.slice(start, end);
});

watch([searchQuery, sortKey, sortOrder], () => {
  currentPage.value = 1;
});

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
};

// === ESTADOS DE MODAIS ===
const showModal = ref(false);
const showDetailsModal = ref(false);
const isEditing = ref(false);
const selectedCliente = ref(null);

// FORMULÁRIO COM TODOS OS CAMPOS DO CLIENTE
const form = ref({
  id: '',
  codigo: '',
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  owner: '',
  __typename: 'ClienteOficina',
  endereco: '', // Pode ser string ou objeto conforme o banco
  carros: [
    {
      marca: '',
      modelo: '',
      placa: '',
      ano: '',
      km_rodados: '',
      ultima_troca: '',
      proxima_troca: ''
    }
  ]
});

const toast = ref({ show: false, msg: '', type: 'success' });
const apiHeaders = { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY };

// === UTILITÁRIOS ===
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch (e) { return dateString; }
};

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

// === API ===
const fetchClientes = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/clientes`, { 
        method: 'GET', 
        headers: apiHeaders 
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha na conexão');
    }

    const data = await response.json();
    clientes.value = data || [];
    
    // Resetar para a primeira página ao carregar novos dados
    currentPage.value = 1; 

  } catch (error) {
    console.error(error);
    showToast(`Erro: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    const isEdit = isEditing.value;
    const url = isEdit ? `${import.meta.env.VITE_API_URL}/clientes/${form.value.id}` : `${import.meta.env.VITE_API_URL}/clientes`;
    const res = await fetch(url, { 
        method: isEdit ? 'PUT' : 'POST', 
        headers: apiHeaders, 
        body: JSON.stringify(form.value) 
    });
    
    if (!res.ok) throw new Error();
    
    showToast(isEdit ? 'Cliente atualizado!' : 'Cliente cadastrado com sucesso!');
    showModal.value = false;
    fetchClientes();
  } catch (e) {
    showToast('Erro ao salvar registro', 'error');
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = async (id) => {
  if (!confirm(`Deseja realmente excluir este cliente permanentemente?`)) return;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/clientes/${id}`, { method: 'DELETE', headers: apiHeaders });
    if (!response.ok) throw new Error();
    showToast('Cliente removido!');
    fetchClientes();
  } catch (e) {
    showToast('Erro ao excluir registro', 'error');
  }
};

const openModalEdit = (c) => {
  isEditing.value = true;
  form.value = JSON.parse(JSON.stringify(c)); // Deep copy
  if (!form.value.carros || form.value.carros.length === 0) {
      form.value.carros = [{ marca: '', modelo: '', placa: '', ano: '', km_rodados: '' }];
  }
  showModal.value = true;
};

const openModalCreate = () => {
  isEditing.value = false;
  form.value = {
    id: '', codigo: '', nome: '', email: '', telefone: '', cpf: '', owner: '',
    __typename: 'ClienteOficina', endereco: '',
    carros: [{ marca: '', modelo: '', placa: '', ano: '', km_rodados: '', ultima_troca: '', proxima_troca: '' }]
  };
  showModal.value = true;
};

onMounted(fetchClientes);
</script>

<template>
  <div class="container-fluid p-4 position-relative">
    
    <!-- TOAST -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['custom-toast', toast.type === 'success' ? 'bg-success' : 'bg-danger']">
        <component :is="toast.type === 'success' ? CheckCircle : AlertTriangle" :size="20" class="me-2" />
        <span>{{ toast.msg }}</span>
      </div>
    </Transition>

    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold text-dark m-0">BASE DE CLIENTES DA OFICINA [CLIENTES DO CLIENTE LUBCONSULTA]</h4>
        <small class="text-muted text-uppercase">Gestão de Proprietários e Manutenções</small>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm" @click="openModalCreate">
        <Plus :size="18" /> Novo Cliente
      </button>
    </div>

    <!-- DATAGRID -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body p-0">
        
        <div class="p-3 border-bottom bg-light d-flex align-items-center">
          <div class="input-group" style="max-width: 450px;">
            <span class="input-group-text bg-white"><Search :size="16"/></span>
            <input type="text" class="form-control border-start-0" placeholder="Buscar por nome, fone, placa ou owner..." v-model="searchQuery">
          </div>
          <div class="ms-auto d-flex align-items-center gap-2">
             <button class="btn btn-sm btn-outline-secondary" @click="fetchClientes" :disabled="isLoading">
                <RefreshCw :size="14" :class="{ 'rotate': isLoading }"/>
             </button>
             <span class="text-muted small fw-bold">{{ sortedAndFilteredClientes.length }} registros</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-orange-subtle text-primary small text-uppercase">
              <tr>
                <th class="py-3 px-4 border-0 sortable" @click="handleSort('owner')">
                  UserId <component :is="sortKey === 'owner' ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown" :size="12"/>
                </th>
                <th class="py-3 px-3 border-0">PlacaVeiculo</th>
                <th class="py-3 px-3 border-0 text-center">Status</th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('nome')">
                  ClienteNome <component :is="sortKey === 'nome' ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown" :size="12"/>
                </th>
                <th class="py-3 px-3 border-0">ServiçoNome</th>
                <th class="py-3 px-3 border-0">ClienteTelefone</th>
                <th class="py-3 px-3 border-0">PróximaManutenção</th>
                <th class="py-3 px-4 border-0 text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading"><td colspan="8" class="text-center py-5">Sincronizando com AWS...</td></tr>
              <tr v-for="c in paginatedItems" :key="c.id">
                <!-- userId (Owner) -->
                <td class="px-4 small text-muted">
                    <span :title="c.owner">{{ (c.owner || '-').substring(0,8) }}...</span>
                </td>
                <!-- placaVeiculo -->
                <td class="px-3">
                    <span class="badge bg-dark text-white font-monospace">{{ c.carros?.[0]?.placa || '-' }}</span>
                </td>
                <!-- status -->
                <td class="px-3 text-center">
                    <span class="badge bg-success-subtle text-success border border-success-subtle">ATIVO</span>
                </td>
                <!-- clienteNome -->
                <td class="px-3 fw-bold text-dark text-uppercase small">{{ c.nome || 'NÃO INFORMADO' }}</td>
                <!-- servicoNome (Modelo do Carro) -->
                <td class="px-3 small text-muted">{{ c.carros?.[0]?.modelo || '-' }}</td>
                <!-- clienteTelefone -->
                <td class="px-3 small fw-bold text-primary">{{ c.telefone || '-' }}</td>
                <!-- dataProximaManutencaoServico -->
                <td class="px-3 small text-danger fw-bold">
                    <div class="d-flex align-items-center gap-1">
                        <Clock :size="12"/> {{ formatDateTime(c.carros?.[0]?.proxima_troca) }}
                    </div>
                </td>
                
                <td class="px-4 text-end">
                  <div class="btn-group shadow-sm border rounded bg-white">
                    <button class="btn btn-sm btn-light text-info" @click="selectedCliente = c; showDetailsModal = true" title="Ficha Completa"><Eye :size="18" /></button>
                    <button class="btn btn-sm btn-light text-primary" @click="openModalEdit(c)" title="Editar"><Edit2 :size="18" /></button>
                    <button class="btn btn-sm btn-light text-danger" @click="confirmDelete(c.id)" title="Excluir"><Trash2 :size="18" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINAÇÃO -->
        <div class="p-3 border-top bg-light d-flex justify-content-between align-items-center rounded-bottom">
          <small class="text-muted">Página {{ currentPage }} de {{ totalPages }}</small>
          <nav>
            <ul class="pagination pagination-sm m-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }"><button class="page-link" @click="currentPage--">Anterior</button></li>
              <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page }">
                <button v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1" class="page-link" @click="currentPage = page">{{ page }}</button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }"><button class="page-link" @click="currentPage++">Próximo</button></li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- MODAL EDITAR / CADASTRAR (TODOS OS CAMPOS) -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="overlay-bg" @click="showModal = false"></div>
        <div class="card border-0 shadow-lg modal-content" style="max-width: 900px; width: 95%;">
          
          <div class="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold m-0 text-uppercase">{{ isEditing ? 'Editar Ficha do Cliente' : 'Novo Cadastro de Oficina' }}</h5>
            <X class="cursor-pointer" @click="showModal = false"/>
          </div>

          <div class="card-body p-4 scroll-form">
            <form @submit.prevent="handleSave" class="row g-3">
              
              <!-- Seção 1: Dados do Proprietário -->
              <div class="col-12 border-bottom pb-2"><small class="text-primary fw-bold">DADOS DO PROPRIETÁRIO</small></div>
              <div class="col-md-6"><label class="form-label small fw-bold">Nome Completo</label><input type="text" class="form-control" v-model="form.nome" required></div>
              <div class="col-md-3"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" v-model="form.telefone" required></div>
              <div class="col-md-3"><label class="form-label small fw-bold">Código Oficina</label><input type="text" class="form-control" v-model="form.codigo"></div>
              
              <div class="col-md-4"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" v-model="form.email"></div>
              <div class="col-md-4"><label class="form-label small fw-bold">CPF/CNPJ</label><input type="text" class="form-control" v-model="form.cpf"></div>
              <div class="col-md-4"><label class="form-label small fw-bold text-muted">Owner ID</label><input type="text" class="form-control bg-light" v-model="form.owner" required></div>

              <!-- Seção 2: Endereço -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">LOCALIZAÇÃO</small></div>
              <div class="col-md-12"><label class="form-label small">Endereço Completo</label><input type="text" class="form-control" v-model="form.endereco"></div>

              <!-- Seção 3: Veículo Principal -->
              <div class="col-12 border-bottom pb-2 mt-4 d-flex align-items-center gap-2">
                  <Car :size="16" class="text-primary"/><small class="text-primary fw-bold">VEÍCULO E MANUTENÇÃO</small>
              </div>
              <div class="col-md-3"><label class="form-label small">Marca</label><input type="text" class="form-control" v-model="form.carros[0].marca"></div>
              <div class="col-md-3"><label class="form-label small">Modelo</label><input type="text" class="form-control" v-model="form.carros[0].modelo"></div>
              <div class="col-md-3"><label class="form-label small">Placa</label><input type="text" class="form-control text-uppercase fw-bold" v-model="form.carros[0].placa"></div>
              <div class="col-md-3"><label class="form-label small">Ano</label><input type="text" class="form-control" v-model="form.carros[0].ano"></div>
              
              <div class="col-md-4"><label class="form-label small">KM Atual</label><input type="text" class="form-control" v-model="form.carros[0].km_rodados"></div>
              <div class="col-md-4"><label class="form-label small">Última Troca (Data)</label><input type="text" class="form-control" v-model="form.carros[0].ultima_troca" placeholder="AAAA-MM-DD"></div>
              <div class="col-md-4"><label class="form-label small text-danger fw-bold">Próxima Troca (Data)</label><input type="text" class="form-control border-danger" v-model="form.carros[0].proxima_troca" placeholder="AAAA-MM-DD"></div>

              <div class="col-12 text-end mt-5">
                <button type="button" class="btn btn-light me-2 fw-bold px-4" @click="showModal = false">CANCELAR</button>
                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSaving">
                    <RefreshCw v-if="isSaving" class="rotate me-2" :size="16"/>
                    SALVAR CLIENTE
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- MODAL VISUALIZAÇÃO (SÓLIDO) -->
    <Transition name="fade">
      <div v-if="showDetailsModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="overlay-bg" @click="showDetailsModal = false"></div>
        <div class="card border-0 shadow-lg modal-content" style="max-width: 750px; width: 95%;">
          
          <div class="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center border-0">
            <h6 class="m-0 fw-bold d-flex align-items-center gap-2"><Info :size="18"/> DETALHES DO CLIENTE DYNAMODB</h6>
            <X class="cursor-pointer" @click="showDetailsModal = false" :size="20"/>
          </div>

          <div class="card-body p-0 bg-white">
             <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-sm table-striped mb-0">
                  <tbody>
                    <tr v-for="(val, key) in selectedCliente" :key="key">
                      <td class="fw-bold small text-primary ps-3 py-2 text-uppercase" style="width: 35%">{{ key }}</td>
                      <td class="small pe-3 py-2 text-dark">
                          <template v-if="Array.isArray(val)">
                              <div v-for="(item, i) in val" :key="i" class="mb-1 p-2 bg-light rounded border extra-small">
                                  {{ item }}
                              </div>
                          </template>
                          <span v-else>{{ val || '-' }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
          
          <div class="card-footer bg-light text-end p-3">
             <button class="btn btn-secondary btn-sm fw-bold px-4" @click="showDetailsModal = false">FECHAR</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.bg-orange-subtle { background-color: #fff7ed !important; }
.text-primary { color: #f97316 !important; }
.btn-primary { background-color: #f97316; border: none; }
.btn-primary:hover { background-color: #ea580c; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1050; }
.overlay-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(3px); }
.modal-content { background: #fff !important; z-index: 1060; border-radius: 12px; overflow: hidden; animation: slideUp 0.3s ease-out; }

.scroll-form { max-height: 75vh; overflow-y: auto; padding-right: 10px; }
.scroll-form::-webkit-scrollbar { width: 5px; }
.scroll-form::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.sortable { cursor: pointer; transition: 0.2s; }
.sortable:hover { background: #fff7ed; }
.font-monospace { font-family: 'Courier New', Courier, monospace; letter-spacing: 0.5px; }
.bg-success-subtle { background-color: #dcfce7 !important; }
.bg-warning-subtle { background-color: #fefce8 !important; }
.cursor-pointer { cursor: pointer; }

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.rotate { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.extra-small { font-size: 0.65rem; }
.table th { font-size: 0.7rem; }
</style>