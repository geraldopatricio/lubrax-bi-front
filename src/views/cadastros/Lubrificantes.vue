<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, Plus, Edit2, CheckCircle, AlertTriangle, X, Activity, Trash2, Eye, 
  Calendar, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, FileText, Info, 
  Tag, Droplets, FlaskConical, Truck, Image as ImageIcon, Settings, Layers,
  Database, Microscope, Beaker, ClipboardList, PenTool, Globe
} from 'lucide-vue-next';

// === ESTADOS (REATIVIDADE) ===
const produtos = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

const sortKey = ref('nome'); 
const sortOrder = ref('asc'); 

const currentPage = ref(1);
const itemsPerPage = 10;

// === LÓGICA DE FILTRAGEM E ORDENAÇÃO ===
const sortedAndFilteredProdutos = computed(() => {
  const term = searchQuery.value.toLowerCase();
  let filtered = produtos.value.filter(p => {
    return (
      (p.nome || '').toLowerCase().includes(term) ||
      (p.marca || '').toLowerCase().includes(term) ||
      (p.viscosidade || '').toLowerCase().includes(term) ||
      (p.identidade_lubconsulta || '').toLowerCase().includes(term)
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

const totalPages = computed(() => Math.ceil(sortedAndFilteredProdutos.value.length / itemsPerPage) || 1);
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return sortedAndFilteredProdutos.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, sortKey, sortOrder], () => currentPage.value = 1);

const handleSort = (key) => {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  else { sortKey.value = key; sortOrder.value = 'asc'; }
};

// === ESTADOS DE MODAIS ===
const showModal = ref(false);
const showDetailsModal = ref(false);
const isEditing = ref(false);
const selectedProduto = ref(null);

// FORMULÁRIO COM TODOS OS CAMPOS DO ENDPOINT (31 CAMPOS)
const form = ref({
  id: '',
  id_original: '',
  identidade_lubconsulta: '',
  nome: '',
  nome_slug: '',
  marca: '',
  viscosidade: '',
  base: '',
  tipo_lubrificante: '',
  subtipo_produto: '',
  tipo_produto: 'lubrificante',
  tipo_veiculo: '',
  acea: '',
  acea_letra: '',
  acea_numerica: -1,
  api: '',
  api_letra: '',
  api_numerica: -1,
  ilsac: '',
  ilsac_letra: '',
  ilsac_numerica: -1,
  jaso: '',
  atende_a: '',
  norma_cambio: '',
  previsao_troca_por_km: '',
  classificacao_freio: '',
  classificacao_particularidade: '',
  classificacao_transmissao: '',
  similaridade: '',
  combustivel: '',
  arquivo_imagem: '',
  arquivo_manual_tecnico: ''
});

const toast = ref({ show: false, msg: '', type: 'success' });
const apiHeaders = { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY };

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

// === Substitua sua função fetchProdutos por esta ===
const fetchProdutos = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/lubrificantes`, { 
        method: 'GET', 
        headers: apiHeaders 
    });
    
    if (!response.ok) throw new Error('Erro na resposta do servidor');
    
    const data = await response.json();
    
    // O backend retorna { produtos: [...] }
    produtos.value = data.produtos || [];
    
    // Garante que a paginação volte ao início após carregar
    currentPage.value = 1;

  } catch (error) { 
    console.error(error);
    showToast('Erro ao carregar catálogo de lubrificantes', 'error'); 
  } finally { 
    isLoading.value = false; 
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    const isEdit = isEditing.value;
    const url = isEdit ? `${import.meta.env.VITE_API_URL}/lubrificantes/${form.value.id}` : `${import.meta.env.VITE_API_URL}/lubrificantes`;
    const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: apiHeaders, body: JSON.stringify(form.value) });
    if (!res.ok) throw new Error();
    showToast('Salvo com sucesso!');
    showModal.value = false;
    fetchProdutos();
  } catch (e) { showToast('Erro ao salvar', 'error'); }
  finally { isSaving.value = false; }
};

const confirmDelete = async (id) => {
  if (!confirm(`Excluir permanentemente?`)) return;
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/lubrificantes/${id}`, { method: 'DELETE', headers: apiHeaders });
    showToast('Removido!');
    fetchProdutos();
  } catch (e) { showToast('Erro ao excluir', 'error'); }
};

const openModalEdit = (p) => {
  isEditing.value = true;
  form.value = { ...p };
  showModal.value = true;
};

const openModalCreate = () => {
  isEditing.value = false;
  form.value = {
    id: '', id_original: '', identidade_lubconsulta: '', nome: '', nome_slug: '', marca: '',
    viscosidade: '', base: '', tipo_lubrificante: '', subtipo_produto: '', tipo_produto: 'lubrificante',
    tipo_veiculo: '', acea: '', acea_letra: '', acea_numerica: -1, api: '', api_letra: '',
    api_numerica: -1, ilsac: '', ilsac_letra: '', ilsac_numerica: -1, jaso: '', atende_a: '',
    norma_cambio: '', previsao_troca_por_km: '', classificacao_freio: '',
    classificacao_particularidade: '', classificacao_transmissao: '', similaridade: '',
    combustivel: '', arquivo_imagem: '', arquivo_manual_tecnico: ''
  };
  showModal.value = true;
};

onMounted(fetchProdutos);
</script>

<template>
  <div class="container-fluid p-4">
    
    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold text-dark m-0">CATÁLOGO TÉCNICO DE LUBRIFICANTES</h4>
        <small class="text-muted">Database Centralizado de Especificações</small>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm" @click="openModalCreate">
        <Plus :size="18" /> Adicionar Produto
      </button>
    </div>

    <!-- DATAGRID -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body p-0">
        <div class="p-3 border-bottom bg-light d-flex align-items-center">
          <div class="input-group" style="max-width: 450px;">
            <span class="input-group-text bg-white"><Search :size="16"/></span>
            <input type="text" class="form-control" placeholder="Filtrar por nome, marca ou viscosidade..." v-model="searchQuery">
          </div>
          <div class="ms-auto d-flex align-items-center gap-2">
             <button class="btn btn-sm btn-outline-secondary" @click="fetchProdutos" :disabled="isLoading"><RefreshCw :size="14" :class="{ 'rotate': isLoading }"/></button>
             <span class="text-muted small fw-bold">{{ sortedAndFilteredProdutos.length }} itens</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-orange-subtle text-primary small text-uppercase">
              <tr>
                <th class="py-3 px-4 border-0 sortable" @click="handleSort('marca')">Marca <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-3 border-0 sortable" @click="handleSort('nome')">Produto <ArrowUpDown :size="12"/></th>
                <th class="py-3 px-3 border-0">Viscosidade</th>
                <th class="py-3 px-3 border-0">Base / Combustível</th>
                <th class="py-3 px-3 border-0 text-center">Troca (km)</th>
                <th class="py-3 px-4 border-0 text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading"><td colspan="6" class="text-center py-5">Carregando dados técnicos...</td></tr>
              <tr v-for="p in paginatedItems" :key="p.id">
                <td class="px-4 fw-bold text-dark text-uppercase small">{{ p.marca || '-' }}</td>
                <td class="px-3">
                  <div class="d-flex align-items-center">
                    <div class="avatar-circle-orange me-3"><Droplets :size="18"/></div>
                    <div class="d-flex flex-column">
                      <span class="fw-bold text-dark small text-uppercase">{{ p.nome || 'SEM NOME' }}</span>
                      <small class="text-muted extra-small">{{ p.identidade_lubconsulta }}</small>
                    </div>
                  </div>
                </td>
                <td class="px-3"><span class="badge bg-dark text-white font-monospace">{{ p.viscosidade || 'N/A' }}</span></td>
                <td class="px-3 small text-muted">
                    <div class="fw-bold text-dark">{{ p.base || '-' }}</div>
                    <div>{{ p.combustivel || '-' }}</div>
                </td>
                <td class="px-3 text-center fw-bold text-primary">{{ p.previsao_troca_por_km || '-' }}</td>
                <td class="px-4 text-end">
                  <div class="btn-group shadow-sm border rounded bg-white">
                    <button class="btn btn-sm btn-light text-info" @click="selectedProduto = p; showDetailsModal = true"><Eye :size="18" /></button>
                    <button class="btn btn-sm btn-light text-primary" @click="openModalEdit(p)"><Edit2 :size="18" /></button>
                    <button class="btn btn-sm btn-light text-danger" @click="confirmDelete(p.id)"><Trash2 :size="18" /></button>
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
        <div class="card border-0 shadow-lg modal-content" style="max-width: 1000px; width: 95%;">
          <div class="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold m-0 text-uppercase">{{ isEditing ? 'EDITAR FICHA TÉCNICA' : 'CADASTRAR LUBRIFICANTE' }}</h5>
            <X class="cursor-pointer" @click="showModal = false"/>
          </div>
          <div class="card-body p-4 scroll-form">
            <form @submit.prevent="handleSave" class="row g-3">
              
              <!-- Seção 1: Identificação -->
              <div class="col-12 border-bottom pb-2 mt-2"><small class="text-primary fw-bold">IDENTIFICAÇÃO BÁSICA</small></div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Nome Comercial</label>
                <input type="text" class="form-control" v-model="form.nome" required>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Marca</label>
                <input type="text" class="form-control" v-model="form.marca" required>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Viscosidade</label>
                <input type="text" class="form-control" v-model="form.viscosidade">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-muted">ID Original</label>
                <input type="text" class="form-control" v-model="form.id_original">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-muted">Identidade LubConsulta</label>
                <input type="text" class="form-control" v-model="form.identidade_lubconsulta">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold text-muted">Nome Slug</label>
                <input type="text" class="form-control" v-model="form.nome_slug">
              </div>

              <!-- Seção 2: Propriedades Químicas -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">PROPRIEDADES E PERFORMANCE</small></div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Base (Sintético/Mineral)</label>
                <input type="text" class="form-control" v-model="form.base">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Combustível</label>
                <input type="text" class="form-control" v-model="form.combustivel">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-primary">Previsão Troca (km)</label>
                <input type="number" class="form-control fw-bold" v-model="form.previsao_troca_por_km">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold">Tipo Veículo</label>
                <input type="text" class="form-control" v-model="form.tipo_veiculo">
              </div>

              <!-- Seção 3: Normas Internacionais -->
              <div class="col-12 border-bottom pb-2 mt-4 d-flex align-items-center gap-2">
                  <Microscope :size="16" class="text-primary"/><small class="text-primary fw-bold">NORMAS INTERNACIONAIS</small>
              </div>
              <!-- ACEA -->
              <div class="col-md-2"><label class="form-label small">ACEA</label><input type="text" class="form-control" v-model="form.acea"></div>
              <div class="col-md-1"><label class="form-label small">Letra</label><input type="text" class="form-control" v-model="form.acea_letra"></div>
              <div class="col-md-1"><label class="form-label small">Num.</label><input type="number" class="form-control" v-model="form.acea_numerica"></div>
              <!-- API -->
              <div class="col-md-2"><label class="form-label small ps-2 border-start">API</label><input type="text" class="form-control" v-model="form.api"></div>
              <div class="col-md-1"><label class="form-label small">Letra</label><input type="text" class="form-control" v-model="form.api_letra"></div>
              <div class="col-md-1"><label class="form-label small">Num.</label><input type="number" class="form-control" v-model="form.api_numerica"></div>
              <!-- ILSAC -->
              <div class="col-md-2"><label class="form-label small ps-2 border-start">ILSAC</label><input type="text" class="form-control" v-model="form.ilsac"></div>
              <div class="col-md-1"><label class="form-label small">Letra</label><input type="text" class="form-control" v-model="form.ilsac_letra"></div>
              <div class="col-md-1"><label class="form-label small">Num.</label><input type="number" class="form-control" v-model="form.ilsac_numerica"></div>
              
              <div class="col-md-3"><label class="form-label small">JASO</label><input type="text" class="form-control" v-model="form.jaso"></div>
              <div class="col-md-9"><label class="form-label small">Atende a (Especificações Complementares)</label><input type="text" class="form-control" v-model="form.atende_a"></div>

              <!-- Seção 4: Classificações de Sistema -->
              <div class="col-12 border-bottom pb-2 mt-4 d-flex align-items-center gap-2">
                  <Settings :size="16" class="text-primary"/><small class="text-primary fw-bold">CLASSIFICAÇÕES DE SISTEMA</small>
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Tipo Produto</label>
                <input type="text" class="form-control" v-model="form.tipo_produto">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Tipo Lubrificante</label>
                <input type="text" class="form-control" v-model="form.tipo_lubrificante">
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Subtipo Produto</label>
                <input type="text" class="form-control" v-model="form.subtipo_produto">
              </div>
              <div class="col-md-3">
                <label class="form-label small">Classif. Freio</label>
                <input type="text" class="form-control" v-model="form.classificacao_freio">
              </div>
              <div class="col-md-3">
                <label class="form-label small">Classif. Transmissão</label>
                <input type="text" class="form-control" v-model="form.classificacao_transmissao">
              </div>
              <div class="col-md-3">
                <label class="form-label small">Norma Câmbio</label>
                <input type="text" class="form-control" v-model="form.norma_cambio">
              </div>
              <div class="col-md-3">
                <label class="form-label small">Particularidade</label>
                <input type="text" class="form-control" v-model="form.classificacao_particularidade">
              </div>
              <div class="col-md-12">
                <label class="form-label small">Similaridades (IDs ou Nomes)</label>
                <textarea class="form-control" rows="2" v-model="form.similaridade"></textarea>
              </div>

              <!-- Seção 5: Mídia -->
              <div class="col-12 border-bottom pb-2 mt-4"><small class="text-primary fw-bold">ARQUIVOS E DOCUMENTAÇÃO</small></div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Arquivo Imagem (.webp)</label>
                <div class="input-group">
                    <span class="input-group-text bg-light"><ImageIcon :size="16"/></span>
                    <input type="text" class="form-control" v-model="form.arquivo_imagem">
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold">Arquivo Manual Técnico (PDF/URL)</label>
                <div class="input-group">
                    <span class="input-group-text bg-light"><FileText :size="16"/></span>
                    <input type="text" class="form-control" v-model="form.arquivo_manual_tecnico">
                </div>
              </div>

              <div class="col-12 text-end mt-5">
                <button type="button" class="btn btn-light me-2 fw-bold px-4" @click="showModal = false">CANCELAR</button>
                <button type="submit" class="btn btn-primary px-5 fw-bold shadow-sm" :disabled="isSaving">
                    <RefreshCw v-if="isSaving" class="rotate me-2" :size="16"/>
                    SALVAR LUBRIFICANTE
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
        <div class="card border-0 shadow-lg modal-content" style="max-width: 800px; width: 95%;">
          <div class="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center border-0">
            <h6 class="m-0 fw-bold d-flex align-items-center gap-2"><Beaker :size="18"/> FICHA TÉCNICA COMPLETA</h6>
            <X class="cursor-pointer" @click="showDetailsModal = false" :size="20"/>
          </div>
          <div class="card-body p-0 bg-white">
             <div class="table-responsive" style="max-height: 550px;">
                <table class="table table-sm table-striped mb-0">
                  <tbody>
                    <tr v-for="(val, key) in selectedProduto" :key="key">
                      <td class="fw-bold small text-primary ps-3 py-2 text-uppercase" style="width: 40%">{{ key.replace(/_/g, ' ') }}</td>
                      <td class="small pe-3 py-2 text-dark">
                          <span v-if="val === null || val === ''" class="text-muted italic">não informado</span>
                          <span v-else>{{ val }}</span>
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
.bg-info-subtle { background-color: #e0f2fe !important; }
.cursor-pointer { cursor: pointer; }

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.rotate { animation: spin 1s linear infinite; }
@keyframes spin { 
    from { transform: rotate(0deg); } 
    to { transform: rotate(360deg); } 
}
</style>