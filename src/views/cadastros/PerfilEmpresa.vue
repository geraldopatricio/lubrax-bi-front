<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, Plus, Edit2, CheckCircle, AlertTriangle, X, Trash2, Eye, 
  RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Building2, MapPin, 
  Globe, Mail, Phone, Hash, Info, User, Clock
} from 'lucide-vue-next';

// === ESTADOS ===
const perfis = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

// Mudamos a chave inicial para 'fantasia'
const sortKey = ref('fantasia'); 
const sortOrder = ref('asc'); 
const currentPage = ref(1);
const itemsPerPage = 8;

// === FILTRAGEM E ORDENAÇÃO ===
const sortedAndFilteredPerfis = computed(() => {
  const term = searchQuery.value.toLowerCase();
  
  let filtered = perfis.value.filter(p => {
    return (
      (p.nome || '').toLowerCase().includes(term) ||
      (p.fantasia || '').toLowerCase().includes(term) ||
      (p.cnpj || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term)
    );
  });

  return filtered.sort((a, b) => {
    // LÓGICA: Colocar quem tem fantasia primeiro
    const hasFantasiaA = !!a.fantasia;
    const hasFantasiaB = !!b.fantasia;
    if (hasFantasiaA && !hasFantasiaB) return -1;
    if (!hasFantasiaA && hasFantasiaB) return 1;

    // Depois segue a ordenação normal da coluna selecionada
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

const totalPages = computed(() => Math.ceil(sortedAndFilteredPerfis.value.length / itemsPerPage) || 1);
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return sortedAndFilteredPerfis.value.slice(start, start + itemsPerPage);
});

const handleSort = (key) => {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  else { sortKey.value = key; sortOrder.value = 'asc'; }
};

// === MODAIS E FORMULÁRIO ===
const showModal = ref(false);
const showDetailsModal = ref(false);
const isEditing = ref(false);
const selectedPerfil = ref(null);

const form = ref({
  id: '', nome: '', fantasia: '', cnpj: '', email: '', telefone: '', site: '', owner: '', user_id: '', tenant_id: '',
  endereco: { endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' }
});

const toast = ref({ show: false, msg: '', type: 'success' });
const apiHeaders = { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY };

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

// === API ACTIONS ===
const fetchPerfis = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/perfilempresa`, { method: 'GET', headers: apiHeaders });
    const data = await response.json();
    perfis.value = data || [];
  } catch (error) {
    showToast('Erro ao carregar perfis', 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    const isEdit = isEditing.value;
    const url = isEdit ? `${import.meta.env.VITE_API_URL}/perfil-empresa/${form.value.id}` : `${import.meta.env.VITE_API_URL}/perfil-empresa`;
    const res = await fetch(url, { 
      method: isEdit ? 'PUT' : 'POST', 
      headers: apiHeaders, 
      body: JSON.stringify(form.value) 
    });
    if (!res.ok) throw new Error();
    showToast(isEdit ? 'Perfil atualizado!' : 'Empresa cadastrada!');
    showModal.value = false;
    fetchPerfis();
  } catch (e) {
    showToast('Erro ao salvar', 'error');
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = async (id) => {
  if (!confirm(`Excluir permanentemente este perfil?`)) return;
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/perfil-empresa/${id}`, { method: 'DELETE', headers: apiHeaders });
    showToast('Perfil removido');
    fetchPerfis();
  } catch (e) {
    showToast('Erro ao excluir', 'error');
  }
};

const openModalEdit = (p) => {
  isEditing.value = true;
  form.value = JSON.parse(JSON.stringify(p));
  if (!form.value.endereco) form.value.endereco = { endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' }; 
  showModal.value = true;
};

const openModalCreate = () => {
  isEditing.value = false;
  form.value = {
    nome: '', fantasia: '', cnpj: '', email: '', telefone: '', site: '', owner: '', user_id: '',
    endereco: { endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' }
  };
  showModal.value = true;
};

onMounted(fetchPerfis);
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
        <h4 class="fw-bold text-dark m-0">PERFIS DE EMPRESAS</h4>
        <small class="text-muted text-uppercase">Gestão de Identidades e Unidades</small>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm" @click="openModalCreate">
        <Plus :size="18" /> Nova Empresa
      </button>
    </div>

    <!-- TABELA -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body p-0">
        <div class="p-3 border-bottom bg-light d-flex align-items-center">
          <div class="input-group" style="max-width: 450px;">
            <span class="input-group-text bg-white"><Search :size="16"/></span>
            <input type="text" class="form-control border-start-0" placeholder="Buscar por Nome, Fantasia ou CNPJ..." v-model="searchQuery">
          </div>
          <div class="ms-auto d-flex align-items-center gap-2">
             <button class="btn btn-sm btn-outline-secondary" @click="fetchPerfis" :disabled="isLoading">
                <RefreshCw :size="14" :class="{ 'rotate': isLoading }"/>
             </button>
             <span class="text-muted small fw-bold">{{ sortedAndFilteredPerfis.length }} registros</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-orange-subtle text-primary small text-uppercase">
              <tr>
                <th class="py-3 px-4 border-0 sortable" @click="handleSort('fantasia')">
                  Nome Fantasia <component :is="sortKey === 'fantasia' ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown" :size="12"/>
                </th>
                <th class="py-3 px-3 border-0">CNPJ</th>
                <th class="py-3 px-3 border-0">Cidade/UF</th>
                <th class="py-3 px-3 border-0">Telefone</th>
                <th class="py-3 px-3 border-0">E-mail</th>
                <th class="py-3 px-4 border-0 text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading"><td colspan="6" class="text-center py-5">Carregando dados da nuvem...</td></tr>
              <tr v-for="p in paginatedItems" :key="p.id">
                <td class="px-4">
                  <!-- Prioridade visual para Fantasia -->
                  <div class="fw-bold text-dark text-uppercase">{{ p.fantasia || '--- SEM NOME FANTASIA ---' }}</div>
                  <small class="text-muted small">{{ p.nome }}</small>
                </td>
                <td class="px-3 small font-monospace">{{ p.cnpj }}</td>
                <td class="px-3 small">
                  {{ p.endereco?.cidade || '-' }} / {{ p.endereco?.estado || '-' }}
                </td>
                <td class="px-3 small fw-bold text-primary">{{ p.telefone || '-' }}</td>
                <td class="px-3 small">{{ p.email || '-' }}</td>
                <td class="px-4 text-end">
                  <div class="btn-group shadow-sm border rounded bg-white">
                    <button class="btn btn-sm btn-light text-info" @click="selectedPerfil = p; showDetailsModal = true" title="Ver Detalhes"><Eye :size="18" /></button>
                    <button class="btn btn-sm btn-light text-primary" @click="openModalEdit(p)" title="Editar"><Edit2 :size="18" /></button>
                    <button class="btn btn-sm btn-light text-danger" @click="confirmDelete(p.id)" title="Excluir"><Trash2 :size="18" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINAÇÃO -->
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

    <!-- MODAL FORMULÁRIO -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="overlay-bg" @click="showModal = false"></div>
        <div class="card border-0 shadow-lg modal-content" style="max-width: 850px; width: 95%;">
          <div class="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold m-0 text-uppercase">{{ isEditing ? 'Editar Perfil' : 'Novo Perfil Empresa' }}</h5>
            <X class="cursor-pointer" @click="showModal = false"/>
          </div>
          <div class="card-body p-4 scroll-form">
            <form @submit.prevent="handleSave" class="row g-3">
              <div class="col-12 border-bottom pb-2"><small class="text-primary fw-bold">DADOS IDENTIFICADORES</small></div>
              <div class="col-md-6"><label class="form-label small fw-bold">Nome Fantasia</label><input type="text" class="form-control border-primary" v-model="form.fantasia"></div>
              <div class="col-md-6"><label class="form-label small fw-bold">Razão Social</label><input type="text" class="form-control" v-model="form.nome" required></div>
              <div class="col-md-4"><label class="form-label small fw-bold">CNPJ</label><input type="text" class="form-control" v-model="form.cnpj"></div>
              <div class="col-md-4"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" v-model="form.telefone"></div>
              <div class="col-md-4"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" v-model="form.email"></div>
              
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">ENDEREÇO</small></div>
              <div class="col-md-8"><label class="form-label small">Logradouro</label><input type="text" class="form-control" v-model="form.endereco.endereco"></div>
              <div class="col-md-4"><label class="form-label small">Número</label><input type="text" class="form-control" v-model="form.endereco.numero"></div>
              <div class="col-md-4"><label class="form-label small">Bairro</label><input type="text" class="form-control" v-model="form.endereco.bairro"></div>
              <div class="col-md-4"><label class="form-label small">Cidade</label><input type="text" class="form-control" v-model="form.endereco.cidade"></div>
              <div class="col-md-4"><label class="form-label small">Estado (UF)</label><input type="text" class="form-control" v-model="form.endereco.estado"></div>

              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">SISTEMA / OWNER</small></div>
              <div class="col-md-6"><label class="form-label small">Owner ID</label><input type="text" class="form-control bg-light" v-model="form.owner"></div>
              <div class="col-md-6"><label class="form-label small">User ID</label><input type="text" class="form-control bg-light" v-model="form.user_id"></div>

              <div class="col-12 text-end mt-5">
                <button type="button" class="btn btn-light me-2 fw-bold" @click="showModal = false">CANCELAR</button>
                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSaving">
                    <RefreshCw v-if="isSaving" class="rotate me-2" :size="16"/> SALVAR PERFIL
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- MODAL VISUALIZAÇÃO (SÓLIDO - IGUAL AO CLIENTE) -->
    <Transition name="fade">
      <div v-if="showDetailsModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="overlay-bg" @click="showDetailsModal = false"></div>
        <div class="card border-0 shadow-lg modal-content" style="max-width: 750px; width: 95%;">
          
          <div class="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center border-0">
            <h6 class="m-0 fw-bold d-flex align-items-center gap-2"><Info :size="18"/> FICHA DETALHADA DA EMPRESA</h6>
            <X class="cursor-pointer" @click="showDetailsModal = false" :size="20"/>
          </div>

          <div class="card-body p-0 bg-white">
             <div class="table-responsive" style="max-height: 550px;">
                <table class="table table-sm table-striped mb-0">
                  <tbody>
                    <!-- DADOS BÁSICOS -->
                    <tr><td colspan="2" class="bg-light ps-3 py-2 small fw-bold text-muted">IDENTIFICAÇÃO</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">ID Registro</td><td class="small py-2">{{ selectedPerfil.id }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Nome Fantasia</td><td class="small py-2 fw-bold">{{ selectedPerfil.fantasia || '-' }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Razão Social</td><td class="small py-2">{{ selectedPerfil.nome || '-' }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">CNPJ</td><td class="small py-2">{{ selectedPerfil.cnpj || '-' }}</td></tr>
                    
                    <!-- CONTATO -->
                    <tr><td colspan="2" class="bg-light ps-3 py-2 small fw-bold text-muted">CONTATO</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">E-mail</td><td class="small py-2">{{ selectedPerfil.email || '-' }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Telefone</td><td class="small py-2">{{ selectedPerfil.telefone || '-' }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Site</td><td class="small py-2">{{ selectedPerfil.site || '-' }}</td></tr>

                    <!-- ENDEREÇO -->
                    <tr><td colspan="2" class="bg-light ps-3 py-2 small fw-bold text-muted">LOCALIZAÇÃO</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Logradouro</td><td class="small py-2">{{ selectedPerfil.endereco?.endereco || '-' }}, {{ selectedPerfil.endereco?.numero || 'S/N' }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Bairro</td><td class="small py-2">{{ selectedPerfil.endereco?.bairro || '-' }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Cidade/UF</td><td class="small py-2">{{ selectedPerfil.endereco?.cidade || '-' }} / {{ selectedPerfil.endereco?.estado || '-' }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">CEP</td><td class="small py-2">{{ selectedPerfil.endereco?.cep || '-' }}</td></tr>

                    <!-- SISTEMA -->
                    <tr><td colspan="2" class="bg-light ps-3 py-2 small fw-bold text-muted">SISTEMA</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Owner</td><td class="small py-2 text-muted">{{ selectedPerfil.owner }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">User ID</td><td class="small py-2 text-muted">{{ selectedPerfil.user_id }}</td></tr>
                    <tr><td class="fw-bold small text-primary ps-3 py-2 text-uppercase">Criado em</td><td class="small py-2 text-muted">{{ selectedPerfil.createdAt }}</td></tr>
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

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.rotate { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>