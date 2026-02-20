<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, Plus, Edit2, CheckCircle, AlertTriangle, X, Activity, Trash2, Eye, 
  Calendar, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Car, Info, 
  Settings, Droplets, Fuel, Gauge, PenTool, Database, Layers, Wrench
} from 'lucide-vue-next';

// === ESTADOS (REATIVIDADE) ===
const carros = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

// === ESTADOS DE ORDENAÇÃO ===
const sortKey = ref('marca'); 
const sortOrder = ref('asc'); 

// === ESTADOS DE PAGINAÇÃO ===
const currentPage = ref(1);
const itemsPerPage = 10;

// === LÓGICA DE FILTRAGEM E ORDENAÇÃO ===
const sortedAndFilteredCarros = computed(() => {
  const term = searchQuery.value.toLowerCase();
  
  let filtered = carros.value.filter(c => {
    return (
      (c.marca || '').toLowerCase().includes(term) ||
      (c.modelo || '').toLowerCase().includes(term) ||
      (c.ano || '').toLowerCase().includes(term) ||
      (c.descricao || '').toLowerCase().includes(term) ||
      (c.identidade_lubconsulta || '').toLowerCase().includes(term)
    );
  });

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

const totalPages = computed(() => Math.ceil(sortedAndFilteredCarros.value.length / itemsPerPage) || 1);
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return sortedAndFilteredCarros.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, sortKey, sortOrder], () => currentPage.value = 1);

const handleSort = (key) => {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  else { sortKey.value = key; sortOrder.value = 'asc'; }
};

// === MODAIS ===
const showModal = ref(false);
const showDetailsModal = ref(false);
const isEditing = ref(false);
const selectedCarro = ref(null);

// FORMULÁRIO COM OS CAMPOS PRINCIPAIS (DADO O VOLUME, MAPEAMOS OS MAIS USADOS)
const form = ref({
  id: '',
  identidade_lubconsulta: '',
  marca: '',
  modelo: '',
  ano: '',
  combustivel: '',
  descricao: '',
  // Óleo Motor
  lub_motor_recomendado: '',
  viscosidade_motor_recomendado: '',
  vol_motor: '',
  // Filtros
  filtro_oleo: '',
  filtro_ar_motor: '',
  filtro_combustivel: '',
  filtro_cabine: '',
  // Transmissão
  turbo: '',
  transmissao: '',
  lub_transm_recomendado: '',
  // Torques
  torques_de_aperto_filtros: '',
  torques_de_aperto_bujoes: ''
});

const toast = ref({ show: false, msg: '', type: 'success' });
const apiHeaders = { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY };

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

// === Substitua sua função fetchCarros por esta ===
const fetchCarros = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/carros`, { 
      method: 'GET', 
      headers: apiHeaders 
    });
    
    if (!response.ok) throw new Error('Erro ao conectar com o servidor');
    
    const data = await response.json();
    carros.value = data || [];
    
    // Opcional: Volta para a página 1 ao atualizar a lista
    currentPage.value = 1; 
    
  } catch (error) { 
    console.error(error);
    showToast('Erro ao carregar Database AWS', 'error'); 
  } finally { 
    isLoading.value = false; 
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    const isEdit = isEditing.value;
    const url = isEdit ? `${import.meta.env.VITE_API_URL}/carros/${form.value.id}` : `${import.meta.env.VITE_API_URL}/carros`;
    const res = await fetch(url, { 
        method: isEdit ? 'PUT' : 'POST', 
        headers: apiHeaders, 
        body: JSON.stringify(form.value) 
    });
    if (!res.ok) throw new Error();
    showToast(isEdit ? 'Veículo atualizado!' : 'Veículo cadastrado!');
    showModal.value = false;
    fetchCarros();
  } catch (e) { showToast('Erro ao salvar', 'error'); }
  finally { isSaving.value = false; }
};

const confirmDelete = async (id) => {
  if (!confirm(`Deseja realmente excluir este veículo?`)) return;
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/carros/${id}`, { method: 'DELETE', headers: apiHeaders });
    showToast('Removido!');
    fetchCarros();
  } catch (e) { showToast('Erro ao excluir', 'error'); }
};

const openModalEdit = (c) => {
  isEditing.value = true;
  // Carregamos todos os campos dinamicamente para não perder dados que não estão no form fixo
  form.value = { ...c }; 
  showModal.value = true;
};

const openModalCreate = () => {
  isEditing.value = false;
  form.value = { marca: '', modelo: '', ano: '', combustivel: '', identidade_lubconsulta: '' };
  showModal.value = true;
};

onMounted(fetchCarros);
</script>

<template>
  <div class="container-fluid p-4">
    
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
        <h4 class="fw-bold text-dark m-0 text-uppercase">Database de Veículos</h4>
        <small class="text-muted">Ficha Técnica e Especificações dos Veículos</small>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm" @click="openModalCreate">
        <Plus :size="18" /> Novo Veículo
      </button>
    </div>

    <!-- DATAGRID -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body p-0">
        <div class="p-3 border-bottom bg-light d-flex align-items-center">
          <div class="input-group" style="max-width: 450px;">
            <span class="input-group-text bg-white"><Search :size="16"/></span>
            <input type="text" class="form-control" placeholder="Buscar marca, modelo, ano ou ID..." v-model="searchQuery">
          </div>
          <div class="ms-auto d-flex align-items-center gap-2">
             <button class="btn btn-sm btn-outline-secondary" @click="fetchCarros" :disabled="isLoading"><RefreshCw :size="14" :class="{ 'rotate': isLoading }"/></button>
             <span class="text-muted small fw-bold">{{ sortedAndFilteredCarros.length }} registros</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-orange-subtle text-primary small text-uppercase">
              <tr>
                <th class="py-3 px-4 border-0 sortable" @click="handleSort('marca')">Marca <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('modelo')">Modelo <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-3 border-0">Ano</th>
                <th class="py-3 px-3 border-0">Motorização</th>
                <th class="py-3 px-3 border-0">Combustível</th>
                <th class="py-3 px-4 border-0 text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading"><td colspan="6" class="text-center py-5">Sincronizando Database...</td></tr>
              <tr v-for="c in paginatedItems" :key="c.id">
                <td class="px-4 fw-bold text-dark text-uppercase small">{{ c.marca || '-' }}</td>
                <td class="px-3">
                  <div class="d-flex align-items-center">
                    <div class="avatar-circle-orange me-3"><Car :size="18"/></div>
                    <div class="d-flex flex-column">
                      <span class="fw-bold text-dark small text-uppercase">{{ c.modelo || 'SEM NOME' }}</span>
                      <small class="text-muted extra-small">{{ (c.identidade_lubconsulta || '').substring(0, 30) }}...</small>
                    </div>
                  </div>
                </td>
                <td class="px-3"><span class="badge bg-dark text-white">{{ c.ano || '-' }}</span></td>
                <td class="px-3 small text-muted text-uppercase">{{ c.descricao || '-' }}</td>
                <td class="px-3 small">
                    <span class="badge bg-info-subtle text-info border text-uppercase">{{ c.combustivel || '-' }}</span>
                </td>
                <td class="px-4 text-end">
                  <div class="btn-group shadow-sm border rounded bg-white">
                    <button class="btn btn-sm btn-light text-info" @click="selectedCarro = c; showDetailsModal = true"><Eye :size="18" /></button>
                    <button class="btn btn-sm btn-light text-primary" @click="openModalEdit(c)"><Edit2 :size="18" /></button>
                    <button class="btn btn-sm btn-light text-danger" @click="confirmDelete(c.id)"><Trash2 :size="18" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 border-top bg-light d-flex justify-content-between align-items-center">
          <small class="text-muted">Página {{ currentPage }} de {{ totalPages }}</small>
          <nav>
            <ul class="pagination pagination-sm m-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }"><button class="page-link" @click="currentPage--">Anterior</button></li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }"><button class="page-link" @click="currentPage++">Próximo</button></li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- MODAL EDITAR / CADASTRAR (MULTI-SEÇÃO) -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="overlay-bg" @click="showModal = false"></div>
        <div class="card border-0 shadow-lg modal-content" style="max-width: 1000px; width: 95%;">
          <div class="card-header bg-white p-4 border-0 d-flex justify-content-between">
            <h5 class="fw-bold m-0">{{ isEditing ? 'EDITAR FICHA DO VEÍCULO' : 'NOVO VEÍCULO NO DATABASE' }}</h5>
            <X class="cursor-pointer" @click="showModal = false"/>
          </div>
          <div class="card-body p-4 scroll-form">
            <form @submit.prevent="handleSave" class="row g-3">
              
              <!-- Seção 1: Básicos -->
              <div class="col-12 border-bottom pb-2 mt-2"><small class="text-primary fw-bold">DADOS DE IDENTIFICAÇÃO</small></div>
              <div class="col-md-3"><label class="form-label small fw-bold">Marca</label><input type="text" class="form-control" v-model="form.marca" required></div>
              <div class="col-md-4"><label class="form-label small fw-bold">Modelo</label><input type="text" class="form-control" v-model="form.modelo" required></div>
              <div class="col-md-2"><label class="form-label small fw-bold">Ano</label><input type="text" class="form-control" v-model="form.ano" required></div>
              <div class="col-md-3"><label class="form-label small fw-bold">Combustível</label><input type="text" class="form-control" v-model="form.combustivel"></div>
              <div class="col-md-12"><label class="form-label small fw-bold">Descrição Completa / Versão</label><input type="text" class="form-control" v-model="form.descricao"></div>
              <div class="col-md-12"><label class="form-label small fw-bold text-muted">Slug Identidade</label><input type="text" class="form-control bg-light" v-model="form.identidade_lubconsulta"></div>

              <!-- Seção 2: Óleo e Cárter -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">LUBRIFICAÇÃO DO MOTOR</small></div>
              <div class="col-md-5">
                <label class="form-label small fw-bold">Lubrificante Recomendado</label>
                <div class="input-group"><span class="input-group-text"><Droplets :size="16"/></span><input type="text" class="form-control" v-model="form.lub_motor_recomendado"></div>
              </div>
              <div class="col-md-3"><label class="form-label small fw-bold">Viscosidade</label><input type="text" class="form-control" v-model="form.viscosidade_motor_recomendado"></div>
              <div class="col-md-2"><label class="form-label small fw-bold">Vol. Cárter</label><input type="text" class="form-control" v-model="form.vol_motor"></div>
              <div class="col-md-2"><label class="form-label small fw-bold">Parcial</label><input type="text" class="form-control" v-model="form.parcial_carter"></div>

              <!-- Seção 3: Filtros -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">COMPONENTES DE FILTRAGEM</small></div>
              <div class="col-md-3"><label class="form-label small">Filtro Óleo</label><input type="text" class="form-control" v-model="form.filtro_oleo"></div>
              <div class="col-md-3"><label class="form-label small">Filtro Ar</label><input type="text" class="form-control" v-model="form.filtro_ar_motor"></div>
              <div class="col-md-3"><label class="form-label small">Filtro Combustível</label><input type="text" class="form-control" v-model="form.filtro_combustivel"></div>
              <div class="col-md-3"><label class="form-label small">Filtro Cabine</label><input type="text" class="form-control" v-model="form.filtro_cabine"></div>

              <!-- Seção 4: Transmissão -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">TRANSMISSÃO E CÂMBIO</small></div>
              <div class="col-md-4"><label class="form-label small">Tipo de Câmbio</label><input type="text" class="form-control" v-model="form.turbo"></div>
              <div class="col-md-4"><label class="form-label small">Modelo Câmbio</label><input type="text" class="form-control" v-model="form.transmissao"></div>
              <div class="col-md-4"><label class="form-label small">Fluido Transmissão</label><input type="text" class="form-control" v-model="form.lub_transm_recomendado"></div>

              <!-- Seção 5: Torques -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">DADOS DE APERTO (TORQUE)</small></div>
              <div class="col-md-6">
                <label class="form-label small">Torque Filtros</label>
                <div class="input-group"><span class="input-group-text"><Wrench :size="16"/></span><input type="text" class="form-control" v-model="form.torques_de_aperto_filtros"></div>
              </div>
              <div class="col-md-6">
                <label class="form-label small">Torque Bujões</label>
                <div class="input-group"><span class="input-group-text"><Wrench :size="16"/></span><input type="text" class="form-control" v-model="form.torques_de_aperto_bujoes"></div>
              </div>

              <div class="col-12 text-end mt-5">
                <button type="button" class="btn btn-light me-2 fw-bold px-4" @click="showModal = false">CANCELAR</button>
                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSaving">
                    <RefreshCw v-if="isSaving" class="rotate me-2" :size="16"/> SALVAR VEÍCULO
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- MODAL DETALHES -->
    <Transition name="fade">
      <div v-if="showDetailsModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="overlay-bg" @click="showDetailsModal = false"></div>
        <div class="card border-0 shadow-lg modal-content" style="max-width: 800px; width: 95%;">
          <div class="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center border-0">
            <h6 class="m-0 fw-bold d-flex align-items-center gap-2"><Layers :size="18"/> ESPECIFICAÇÃO TÉCNICA COMPLETA</h6>
            <X class="cursor-pointer" @click="showDetailsModal = false" :size="20"/>
          </div>
          <div class="card-body p-0 bg-white">
             <div class="table-responsive" style="max-height: 550px;">
                <table class="table table-sm table-striped mb-0">
                  <tbody>
                    <tr v-for="(val, key) in selectedCarro" :key="key">
                      <td class="fw-bold small text-primary ps-3 py-2 text-uppercase" style="width: 40%">{{ key.replace(/_/g, ' ') }}</td>
                      <td class="small pe-3 py-2 text-dark">{{ val === null || val === '' ? '-' : val }}</td>
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
.avatar-circle-orange { width: 38px; height: 38px; background: #fff7ed; color: #f97316; border: 1px solid #fdba74; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1050; }
.overlay-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(3px); }
.modal-content { background: #fff !important; z-index: 1060; border-radius: 12px; overflow: hidden; animation: slideUp 0.3s ease-out; }

.scroll-form { max-height: 75vh; overflow-y: auto; padding-right: 10px; }
.scroll-form::-webkit-scrollbar { width: 5px; }
.scroll-form::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.sortable { cursor: pointer; transition: 0.2s; }
.sortable:hover { background: #fff7ed; }
.bg-info-subtle { background-color: #e0f2fe !important; }
.extra-small { font-size: 0.65rem; }
.cursor-pointer { cursor: pointer; }

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.rotate { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>