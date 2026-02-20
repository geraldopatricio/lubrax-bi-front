<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, Plus, Edit2, CheckCircle, AlertTriangle, X, User, Lock, Mail, 
  Activity, Trash2, Eye, Calendar, Phone, Building, Download, 
  RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Car, MessageSquare, Hash, 
  UserCircle, Shield, FileText, Info, Clock, Send
} from 'lucide-vue-next';

// === ESTADOS (REATIVIDADE) ===
const mensagens = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

const sortKey = ref('clienteNome'); 
const sortOrder = ref('asc'); 

const currentPage = ref(1);
const itemsPerPage = 10;

// === LÓGICA DE FILTRAGEM E ORDENAÇÃO ===
const sortedAndFilteredMensagens = computed(() => {
  const term = searchQuery.value.toLowerCase();
  let filtered = mensagens.value.filter(m => {
    return (
      (m.clienteNome || '').toLowerCase().includes(term) ||
      (m.clienteTelefone || '').toLowerCase().includes(term) ||
      (m.placaVeiculo || '').toLowerCase().includes(term) ||
      (m.servicoNome || '').toLowerCase().includes(term) ||
      (m.status || '').toLowerCase().includes(term) ||
      (m.userId || '').toLowerCase().includes(term)
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

const totalPages = computed(() => Math.ceil(sortedAndFilteredMensagens.value.length / itemsPerPage) || 1);
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return sortedAndFilteredMensagens.value.slice(start, start + itemsPerPage);
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
const selectedMensagem = ref(null);

// FORMULÁRIO COM TODOS OS CAMPOS DO ENDPOINT (13 CAMPOS)
const form = ref({
  id: null,
  clienteId: '',
  clienteNome: '',
  clienteTelefone: '',
  dataDisparo: '',
  dataProximaManutencaoServico: '',
  mensagem: '',
  placaVeiculo: '',
  servicoId: '',
  servicoNome: '',
  status: 'AGENDADO',
  userId: '',
  whatsappId: ''
});

const toast = ref({ show: false, msg: '', type: 'success' });
const apiHeaders = { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY };

// === UTILITÁRIOS ===
const formatDateTime = (dateString) => {
  if (!dateString || dateString.startsWith('1969') || dateString.startsWith('1970')) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(date);
  } catch (e) { return dateString; }
};

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

// === API ===
const fetchMensagens = async () => {
  isLoading.value = true;
  try {
    console.log("Chamando API de mensagens...");
    const response = await fetch(`${import.meta.env.VITE_API_URL}/mensagensprogramadas`, { 
      method: 'GET', 
      headers: apiHeaders 
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao buscar dados');
    }

    const data = await response.json();
    console.log("Dados recebidos:", data.length, "registros.");
    mensagens.value = data;
  } catch (error) {
    console.error("Erro no Frontend:", error);
    showToast(error.message, 'error');
  } finally {
    isLoading.value = false; // Isso garante que a mensagem de "Buscando..." saia da tela
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    const isEdit = isEditing.value;
    const url = isEdit ? `${import.meta.env.VITE_API_URL}/mensagensprogramadas/${form.value.id}` : `${import.meta.env.VITE_API_URL}/mensagensprogramadas`;
    const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: apiHeaders, body: JSON.stringify(form.value) });
    if (!res.ok) throw new Error();
    showToast(isEdit ? 'Agendamento atualizado!' : 'Mensagem programada!');
    showModal.value = false;
    fetchMensagens();
  } catch (e) { showToast('Erro ao salvar', 'error'); }
  finally { isSaving.value = false; }
};

const confirmDelete = async (id) => {
  if (!confirm(`Deseja cancelar e remover este agendamento?`)) return;
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/mensagensprogramadas/${id}`, { method: 'DELETE', headers: apiHeaders });
    showToast('Removido!');
    fetchMensagens();
  } catch (e) { showToast('Erro ao excluir', 'error'); }
};

const openModalEdit = (msg) => {
  isEditing.value = true;
  form.value = { ...msg };
  showModal.value = true;
};

const openModalCreate = () => {
  isEditing.value = false;
  form.value = {
    id: null, clienteId: '', clienteNome: '', clienteTelefone: '', dataDisparo: '',
    dataProximaManutencaoServico: '', mensagem: '', placaVeiculo: '', servicoId: '',
    servicoNome: '', status: 'AGENDADO', userId: '', whatsappId: ''
  };
  showModal.value = true;
};

onMounted(fetchMensagens);
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
        <h4 class="fw-bold text-dark m-0 text-uppercase">Gestão de Mensagens Programadas</h4>
        <small class="text-muted">Fila de Disparos de WhatsApp (LubZap System)</small>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm" @click="openModalCreate">
        <Send :size="18" /> Novo Agendamento
      </button>
    </div>

    <!-- DATAGRID -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body p-0">
        <div class="p-3 border-bottom bg-light d-flex align-items-center">
          <div class="input-group" style="max-width: 450px;">
            <span class="input-group-text bg-white"><Search :size="16"/></span>
            <input type="text" class="form-control" placeholder="Buscar por cliente, placa, status ou ID..." v-model="searchQuery">
          </div>
          <div class="ms-auto d-flex align-items-center gap-2">
             <button class="btn btn-sm btn-outline-secondary" @click="fetchMensagens" :disabled="isLoading"><RefreshCw :size="14" :class="{ 'rotate': isLoading }"/></button>
             <span class="text-muted small fw-bold">{{ sortedAndFilteredMensagens.length }} registros</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-orange-subtle text-primary small text-uppercase">
              <tr>
                <th class="py-3 px-4 border-0 sortable" @click="handleSort('userId')">UserId <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('placaVeiculo')">Placa <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-3 border-0 text-center">Status</th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('clienteNome')">Cliente <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-3 border-0">Serviço</th>
                <th class="py-3 px-3 border-0">Telefone</th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('dataDisparo')">Data Disparo <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-4 border-0 text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading"><td colspan="8" class="text-center py-5">Buscando fila na AWS...</td></tr>
              <tr v-for="m in paginatedItems" :key="m.id">
                <td class="px-4 small text-muted">{{ (m.userId || '-').substring(0,8) }}...</td>
                <td class="px-3"><span class="badge bg-dark text-white font-monospace">{{ m.placaVeiculo || '-' }}</span></td>
                <td class="px-3 text-center">
                    <span class="badge" :class="m.status === 'AGENDADO' ? 'bg-info-subtle text-info border border-info-subtle' : 'bg-success-subtle text-success border border-success-subtle'">
                        {{ m.status || 'PENDENTE' }}
                    </span>
                </td>
                <td class="px-3 fw-bold text-dark text-uppercase small">{{ m.clienteNome || 'NÃO INFORMADO' }}</td>
                <td class="px-3 small text-muted">{{ m.servicoNome || '-' }}</td>
                <td class="px-3 small fw-bold text-primary">{{ m.clienteTelefone || '-' }}</td>
                <td class="px-3 small">
                    <div class="d-flex align-items-center gap-1 text-dark fw-bold">
                        <Calendar :size="12" class="text-primary"/> {{ formatDateTime(m.dataDisparo) }}
                    </div>
                </td>
                <td class="px-4 text-end">
                  <div class="btn-group shadow-sm border rounded bg-white">
                    <button class="btn btn-sm btn-light text-info" @click="selectedMensagem = m; showDetailsModal = true" title="Ver Tudo"><Eye :size="18" /></button>
                    <button class="btn btn-sm btn-light text-primary" @click="openModalEdit(m)" title="Editar"><Edit2 :size="18" /></button>
                    <button class="btn btn-sm btn-light text-danger" @click="confirmDelete(m.id)" title="Excluir"><Trash2 :size="18" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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

    <!-- MODAL EDITAR / CADASTRAR (TODOS OS 13 CAMPOS) -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="overlay-bg" @click="showModal = false"></div>
        <div class="card border-0 shadow-lg modal-content" style="max-width: 900px; width: 95%;">
          <div class="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold m-0 text-uppercase">{{ isEditing ? 'Editar Agendamento' : 'Programar Novo Disparo' }}</h5>
            <X class="cursor-pointer" @click="showModal = false"/>
          </div>
          <div class="card-body p-4 scroll-form">
            <form @submit.prevent="handleSave" class="row g-3">
              
              <!-- Seção 1: IDs de Sistema -->
              <div class="col-12 border-bottom pb-2 mt-2"><small class="text-primary fw-bold">IDENTIFICAÇÃO TÉCNICA (AWS)</small></div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-muted">User ID</label>
                <input type="text" class="form-control bg-light" v-model="form.userId">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-muted">WhatsApp ID</label>
                <input type="text" class="form-control" v-model="form.whatsappId">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-muted">Status do Agendamento</label>
                <select class="form-select fw-bold" v-model="form.status">
                    <option value="AGENDADO">AGENDADO</option>
                    <option value="ENVIADO">ENVIADO</option>
                    <option value="FALHA">FALHA</option>
                </select>
              </div>

              <!-- Seção 2: Dados do Cliente e Veículo -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">DADOS DO CLIENTE E VEÍCULO</small></div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Nome do Cliente</label>
                <input type="text" class="form-control" v-model="form.clienteNome" required>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Telefone</label>
                <input type="text" class="form-control" v-model="form.clienteTelefone" required>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Placa</label>
                <input type="text" class="form-control text-uppercase" v-model="form.placaVeiculo">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-muted">Cliente ID (Dynamo)</label>
                <input type="text" class="form-control small" v-model="form.clienteId">
              </div>

              <!-- Seção 3: Serviço e Datas -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">DADOS DO SERVIÇO E DISPARO</small></div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Serviço / Manutenção</label>
                <input type="text" class="form-control" v-model="form.servicoNome">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-primary">Data do Disparo</label>
                <input type="text" class="form-control" v-model="form.dataDisparo" placeholder="YYYY-MM-DDTHH:mm:ss.sssZ">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-danger">Próxima Manutenção</label>
                <input type="text" class="form-control" v-model="form.dataProximaManutencaoServico" placeholder="YYYY-MM-DDTHH:mm:ss.sssZ">
              </div>
              <div class="col-md-12">
                <label class="form-label small fw-bold text-muted">Serviço ID (Interno)</label>
                <input type="text" class="form-control small" v-model="form.servicoId">
              </div>

              <!-- Seção 4: Mensagem -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">CONTEÚDO DA MENSAGEM</small></div>
              <div class="col-12">
                <label class="form-label small fw-bold">Texto do WhatsApp</label>
                <textarea class="form-control" rows="4" v-model="form.mensagem" placeholder="Deixe vazio para usar mensagem padrão..."></textarea>
              </div>

              <div class="col-12 text-end mt-5">
                <button type="button" class="btn btn-light me-2 fw-bold px-4" @click="showModal = false">CANCELAR</button>
                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSaving">
                    <RefreshCw v-if="isSaving" class="rotate me-2" :size="16"/>
                    SALVAR PROGRAMAÇÃO
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
        <div class="card border-0 shadow-lg modal-content" style="max-width: 700px; width: 95%;">
          <div class="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center border-0">
            <h6 class="m-0 fw-bold d-flex align-items-center gap-2"><MessageSquare :size="18"/> DETALHES DO DISPARO PROGRAMADO</h6>
            <X class="cursor-pointer" @click="showDetailsModal = false" :size="20"/>
          </div>
          <div class="card-body p-0">
             <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-sm table-striped mb-0">
                  <tbody>
                    <tr v-for="(val, key) in selectedMensagem" :key="key">
                      <td class="fw-bold small text-primary ps-3 py-2 text-uppercase" style="width: 35%">{{ key }}</td>
                      <td class="small pe-3 py-2 text-dark">{{ val || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
          <div class="card-footer bg-light text-end p-3 border-0">
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
.sortable:hover { background: #fff1f2; }
.font-monospace { font-family: monospace; letter-spacing: 1px; }

.bg-info-subtle { background-color: #e0f2fe !important; }
.bg-success-subtle { background-color: #dcfce7 !important; }
.cursor-pointer { cursor: pointer; }

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.rotate { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.custom-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 25px; border-radius: 50px; z-index: 9999; display: flex; align-items: center; font-weight: 600; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
</style>