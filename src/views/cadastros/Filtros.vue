<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, Plus, Edit2, CheckCircle, AlertTriangle, X, Activity, Trash2, Eye, 
  Calendar, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, FileText, Info, 
  Tag, Box, Maximize, Layers, Image as ImageIcon, Truck, Database, ClipboardList, Map
} from 'lucide-vue-next';

// === ESTADOS (REATIVIDADE) ===
const filtros = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

const sortKey = ref('nome'); 
const sortOrder = ref('asc'); 

const currentPage = ref(1);
const itemsPerPage = 10;

// === LÓGICA DE FILTRAGEM E ORDENAÇÃO ===
const sortedAndFilteredFiltros = computed(() => {
  const term = searchQuery.value.toLowerCase();
  
  // 1. Filtro de Busca Global
  let filtered = filtros.value.filter(f => {
    return (
      (f.nome || '').toLowerCase().includes(term) ||
      (f.marca || '').toLowerCase().includes(term) ||
      (f.produto || '').toLowerCase().includes(term) ||
      (f.codigo || '').toLowerCase().includes(term) ||
      (f.similaridade || '').toLowerCase().includes(term) ||
      (f.identidade_lubconsulta || '').toLowerCase().includes(term)
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
  return Math.ceil(sortedAndFilteredFiltros.value.length / itemsPerPage) || 1;
});

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return sortedAndFilteredFiltros.value.slice(start, end);
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
const selectedFiltro = ref(null);

// FORMULÁRIO COM TODOS OS CAMPOS DO FILTRO (19 CAMPOS)
const form = ref({
  id: '',
  identidade_lubconsulta: '',
  produto: '',
  altura: '',
  largura: '',
  comprimento: '',
  aplicacao: '',
  codigo: '',
  codigo_cambio: '',
  descricao_tecnica: '',
  grupo: '',
  linha_veiculo: '',
  marca: '',
  nome: '',
  similaridade: '',
  arquivo_imagem: '',
  arquivo_imagem_2: '',
  arquivo_imagem_3: '',
  arquivo_imagem_4: ''
});

const toast = ref({ show: false, msg: '', type: 'success' });
const apiHeaders = { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY };

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

// === Substitua sua função fetchFiltros por esta ===
const fetchFiltros = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/filtros`, { 
      method: 'GET', 
      headers: apiHeaders 
    });
    
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.details || 'Falha na conexão');
    }
    
    const data = await response.json();
    filtros.value = data || [];
    
    // Reset para a primeira página ao recarregar a lista
    currentPage.value = 1; 

  } catch (error) {
    console.error("Erro ao buscar filtros:", error);
    showToast(`Erro ao carregar catálogo: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    const isEdit = isEditing.value;
    const url = isEdit ? `${import.meta.env.VITE_API_URL}/filtros/${form.value.id}` : `${import.meta.env.VITE_API_URL}/filtros`;
    const res = await fetch(url, { 
        method: isEdit ? 'PUT' : 'POST', 
        headers: apiHeaders, 
        body: JSON.stringify(form.value) 
    });
    
    if (!res.ok) throw new Error();
    
    showToast(isEdit ? 'Filtro atualizado!' : 'Filtro cadastrado com sucesso!');
    showModal.value = false;
    fetchFiltros();
  } catch (e) {
    showToast('Erro ao salvar registro', 'error');
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = async (id) => {
  if (!confirm(`Deseja realmente remover este filtro permanentemente?`)) return;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/filtros/${id}`, { method: 'DELETE', headers: apiHeaders });
    if (!response.ok) throw new Error();
    showToast('Registro excluído!');
    fetchFiltros();
  } catch (e) {
    showToast('Erro ao excluir registro', 'error');
  }
};

const openModalEdit = (f) => {
  isEditing.value = true;
  form.value = { ...f };
  showModal.value = true;
};

const openModalCreate = () => {
  isEditing.value = false;
  form.value = {
    id: '', identidade_lubconsulta: '', produto: '', altura: '', largura: '', comprimento: '',
    aplicacao: '', codigo: '', codigo_cambio: '', descricao_tecnica: '', grupo: '',
    linha_veiculo: '', marca: '', nome: '', similaridade: '', arquivo_imagem: '',
    arquivo_imagem_2: '', arquivo_imagem_3: '', arquivo_imagem_4: ''
  };
  showModal.value = true;
};

onMounted(fetchFiltros);
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

    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold text-dark m-0">CATÁLOGO DE FILTROS</h4>
        <small class="text-muted text-uppercase">Gestão de Componentes e Aplicações</small>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm" @click="openModalCreate">
        <Plus :size="18" /> Novo Filtro
      </button>
    </div>

    <!-- DATAGRID -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body p-0">
        
        <div class="p-3 border-bottom bg-light d-flex align-items-center">
          <div class="input-group" style="max-width: 450px;">
            <span class="input-group-text bg-white"><Search :size="16"/></span>
            <input type="text" class="form-control" placeholder="Pesquisar por marca, nome, similaridade..." v-model="searchQuery">
          </div>
          <div class="ms-auto d-flex align-items-center gap-2">
             <button class="btn btn-sm btn-outline-secondary" @click="fetchFiltros" :disabled="isLoading">
                <RefreshCw :size="14" :class="{ 'rotate': isLoading }"/>
             </button>
             <span class="text-muted small fw-bold">{{ sortedAndFilteredFiltros.length }} registros</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-orange-subtle text-primary small text-uppercase">
              <tr>
                <th class="py-3 px-4 border-0 sortable" @click="handleSort('marca')">
                  Marca <component :is="sortKey === 'marca' ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown" :size="12"/>
                </th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('nome')">
                  Produto <component :is="sortKey === 'nome' ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown" :size="12"/>
                </th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('grupo')">
                  Grupo <component :is="sortKey === 'grupo' ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown" :size="12"/>
                </th>
                <th class="py-3 px-3 border-0">Dimensões (AxLxC)</th>
                <th class="py-3 px-3 border-0">Cód. Referência</th>
                <th class="py-3 px-4 border-0 text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading"><td colspan="6" class="text-center py-5">Sincronizando com AWS...</td></tr>
              <tr v-for="f in paginatedItems" :key="f.id">
                <td class="px-4 fw-bold text-dark text-uppercase small">{{ f.marca || '-' }}</td>
                <td class="px-3">
                  <div class="d-flex align-items-center">
                    <div class="avatar-circle-orange me-3"><Box :size="18"/></div>
                    <div class="d-flex flex-column">
                      <span class="fw-bold text-dark small text-uppercase">{{ f.nome || 'SEM NOME' }}</span>
                      <small class="text-muted extra-small">ID: {{ f.identidade_lubconsulta }}</small>
                    </div>
                  </div>
                </td>
                <td class="px-3">
                    <span class="badge bg-light text-dark border">{{ f.grupo || '-' }}</span>
                </td>
                <td class="px-3 small text-muted font-monospace">
                   {{ f.altura || '0' }} x {{ f.largura || '0' }} x {{ f.comprimento || '0' }}
                </td>
                <td class="px-3">
                    <div class="small fw-bold text-primary">{{ f.codigo || '-' }}</div>
                    <div class="extra-small text-muted">{{ f.produto }}</div>
                </td>
                <td class="px-4 text-end">
                  <div class="btn-group shadow-sm border rounded bg-white">
                    <button class="btn btn-sm btn-light text-info" @click="selectedFiltro = f; showDetailsModal = true" title="Ver Detalhes"><Eye :size="18" /></button>
                    <button class="btn btn-sm btn-light text-primary" @click="openModalEdit(f)" title="Editar"><Edit2 :size="18" /></button>
                    <button class="btn btn-sm btn-light text-danger" @click="confirmDelete(f.id)" title="Excluir"><Trash2 :size="18" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINAÇÃO -->
        <div class="p-3 border-top bg-light d-flex justify-content-between align-items-center rounded-bottom">
          <small class="text-muted">Exibindo página {{ currentPage }} de {{ totalPages }}</small>
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
            <h5 class="fw-bold m-0 text-uppercase">{{ isEditing ? 'Editar Filtro' : 'Novo Filtro' }}</h5>
            <X class="cursor-pointer" @click="showModal = false"/>
          </div>

          <div class="card-body p-4 scroll-form">
            <form @submit.prevent="handleSave" class="row g-3">
              
              <!-- Seção 1: Identificação -->
              <div class="col-12 border-bottom pb-2"><small class="text-primary fw-bold">IDENTIFICAÇÃO DO PRODUTO</small></div>
              <div class="col-md-6"><label class="form-label small fw-bold">Nome de Exibição</label><input type="text" class="form-control" v-model="form.nome" required></div>
              <div class="col-md-3"><label class="form-label small fw-bold">Marca</label><input type="text" class="form-control" v-model="form.marca" required></div>
              <div class="col-md-3"><label class="form-label small fw-bold">ID LubConsulta</label><input type="text" class="form-control bg-light" v-model="form.identidade_lubconsulta" required></div>
              
              <div class="col-md-4"><label class="form-label small fw-bold">Produto (Ref.)</label><input type="text" class="form-control" v-model="form.produto"></div>
              <div class="col-md-4"><label class="form-label small fw-bold">Código Interno</label><input type="text" class="form-control" v-model="form.codigo"></div>
              <div class="col-md-4"><label class="form-label small fw-bold">Cód. Câmbio</label><input type="text" class="form-control" v-model="form.codigo_cambio"></div>

              <!-- Seção 2: Classificações -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">CATEGORIAS E CLASSIFICAÇÃO</small></div>
              <div class="col-md-4"><label class="form-label small fw-bold">Grupo</label><input type="text" class="form-control" v-model="form.grupo" placeholder="Ex: FILTRO AR, FILTRO ÓLEO"></div>
              <div class="col-md-4"><label class="form-label small fw-bold">Linha de Veículo</label><input type="text" class="form-control" v-model="form.linha_veiculo"></div>
              <div class="col-md-4"><label class="form-label small fw-bold">Descrição Técnica</label><input type="text" class="form-control" v-model="form.descricao_tecnica"></div>
              <div class="col-12"><label class="form-label small">Similaridades</label><textarea class="form-control" rows="2" v-model="form.similaridade" placeholder="Códigos de outras marcas separados por vírgula"></textarea></div>

              <!-- Seção 3: Dimensões -->
              <div class="col-12 border-bottom pb-2 mt-4 d-flex align-items-center gap-2">
                  <Maximize :size="16" class="text-primary"/><small class="text-primary fw-bold">DIMENSÕES TÉCNICAS (mm)</small>
              </div>
              <div class="col-md-4"><label class="form-label small">Altura</label><input type="text" class="form-control" v-model="form.altura"></div>
              <div class="col-md-4"><label class="form-label small">Largura</label><input type="text" class="form-control" v-model="form.largura"></div>
              <div class="col-md-4"><label class="form-label small">Comprimento</label><input type="text" class="form-control" v-model="form.comprimento"></div>

              <!-- Seção 4: Aplicação -->
              <div class="col-12 border-bottom pb-2 mt-4 d-flex align-items-center gap-2">
                  <Truck :size="16" class="text-primary"/><small class="text-primary fw-bold">APLICAÇÕES E COMPATIBILIDADE</small>
              </div>
              <div class="col-12"><textarea class="form-control" rows="3" v-model="form.aplicacao" placeholder="Liste aqui os veículos e motores atendidos por este filtro"></textarea></div>

              <!-- Seção 5: Mídia -->
              <div class="col-12 border-bottom pb-2 mt-4 d-flex align-items-center gap-2">
                  <ImageIcon :size="16" class="text-primary"/><small class="text-primary fw-bold">GALERIA DE IMAGENS</small>
              </div>
              <div class="col-md-6"><label class="form-label extra-small">Imagem Principal</label><input type="text" class="form-control form-control-sm" v-model="form.arquivo_imagem"></div>
              <div class="col-md-6"><label class="form-label extra-small">Imagem 2</label><input type="text" class="form-control form-control-sm" v-model="form.arquivo_imagem_2"></div>
              <div class="col-md-6"><label class="form-label extra-small">Imagem 3</label><input type="text" class="form-control form-control-sm" v-model="form.arquivo_imagem_3"></div>
              <div class="col-md-6"><label class="form-label extra-small">Imagem 4</label><input type="text" class="form-control form-control-sm" v-model="form.arquivo_imagem_4"></div>

              <div class="col-12 text-end mt-5">
                <button type="button" class="btn btn-light me-2 fw-bold px-4" @click="showModal = false">CANCELAR</button>
                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSaving">
                    <RefreshCw v-if="isSaving" class="rotate me-2" :size="16"/>
                    SALVAR FILTRO
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
            <h6 class="m-0 fw-bold d-flex align-items-center gap-2"><Layers :size="18"/> DETALHES COMPLETOS DO FILTRO</h6>
            <X class="cursor-pointer" @click="showDetailsModal = false" :size="20"/>
          </div>

          <div class="card-body p-0 bg-white">
             <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-sm table-striped mb-0">
                  <tbody>
                    <tr v-for="(val, key) in selectedFiltro" :key="key">
                      <td class="fw-bold small text-primary ps-3 py-2 text-uppercase" style="width: 35%">{{ key.replace(/_/g, ' ') }}</td>
                      <td class="small pe-3 py-2 text-dark">{{ val || '-' }}</td>
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

.avatar-circle-orange { 
    width: 38px; height: 38px; background: #fff7ed; color: #f97316; 
    border: 1px solid #fdba74; border-radius: 50%; 
    display: flex; align-items: center; justify-content: center; 
}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1050; }
.overlay-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(3px); }
.modal-content { background: #fff !important; z-index: 1060; border-radius: 12px; overflow: hidden; animation: slideUp 0.3s ease-out; }

.scroll-form { max-height: 75vh; overflow-y: auto; padding-right: 10px; }
.scroll-form::-webkit-scrollbar { width: 5px; }
.scroll-form::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.sortable { cursor: pointer; transition: 0.2s; }
.sortable:hover { background: #fff7ed; }
.font-monospace { font-family: 'Courier New', Courier, monospace; letter-spacing: 0.5px; }
.extra-small { font-size: 0.65rem; }
.cursor-pointer { cursor: pointer; }

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.rotate { animation: spin 1s linear infinite; }
@keyframes spin { 
    from { transform: rotate(0deg); } 
    to { transform: rotate(360deg); } 
}

.table th { font-size: 0.7rem; }
</style>