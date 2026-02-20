<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { Bar } from 'vue-chartjs';
import { 
  Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, 
  LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  Zap, RefreshCcw, ChevronRight, Calendar as CalendarIcon, 
  ArrowRight, MessageSquareDashed, Send, Loader2, X, Phone
} from 'lucide-vue-next';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

// --- ESTADOS ---
const rawUsers = ref([]);
const enrichedData = ref([]); 
const loading = ref(true);
const progress = ref(0); 

// Filtros de Data (Últimos 7 dias por padrão)
const getFormattedDate = (daysAgo = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
};
const dateStart = ref(getFormattedDate(7));
const dateEnd = ref(getFormattedDate(0));

// --- ESTADOS DE MENSAGENS ---
const showSingleModal = ref(false);
const showBulkModal = ref(false);
const sendingMessage = ref(false);
const bulkStatus = ref({ active: false, current: 0, total: 0, name: '', logs: [] });

const formSingle = ref({ name: '', phone: '', rawPhone: '', message: '', userToken: '' });
const formBulk = ref({ message: 'Olá $name, a LUBCONSULTA deseja a você um excelente dia, conte sempre conosco.' });

const apiHeaders = { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY };

// --- UTILITÁRIOS ---
const delay = (ms) => new Promise(res => setTimeout(res, ms));

const sanitizePhone = (phone) => {
    let cleaned = String(phone).replace(/\D/g, ''); 
    if (cleaned.length < 10) return cleaned;
    let ddi = '55';
    let ddd = cleaned.startsWith('55') ? cleaned.substring(2, 4) : cleaned.substring(0, 2);
    let last8 = cleaned.slice(-8);
    return ddi + ddd + last8;
};

const formatMessage = (template, name) => template.replace('$name', name || 'Cliente');

// --- BUSCA DE DADOS OTIMIZADA (PARALELA) ---
const initDashboard = async () => {
    loading.value = true;
    progress.value = 0;
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/cognito/usuarios`, { headers: apiHeaders });
        const usersList = res.data;
        rawUsers.value = usersList;

        // Otimização: Buscamos em "chunks" (lotes de 10 em 10) para ser 10x mais rápido
        const results = [];
        const batchSize = 10;
        
        for (let i = 0; i < usersList.length; i += batchSize) {
            const batch = usersList.slice(i, i + batchSize);
            const batchPromises = batch.map(async (user) => {
                try {
                    const resZap = await axios.get(`https://api.lubzap.lubconsulta.com.br/messages_list/${user.Username}`);
                    return {
                        ...user,
                        msgTotalGeral: resZap.data.total || 0,
                        history: resZap.data.items || [],
                        stats: null 
                    };
                } catch (e) {
                    return { ...user, msgTotalGeral: 0, history: [], stats: null };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            progress.value = Math.round(((i + batch.length) / usersList.length) * 100);
        }

        // Challenge 1: Carregar stats do Top 20
        const top20 = [...results].sort((a,b) => b.msgTotalGeral - a.msgTotalGeral).slice(0, 20);
        await Promise.all(top20.map(async (u) => {
            try {
                const s = await axios.get(`https://api.lubzap.lubconsulta.com.br/info-status?userId=${u.Username}`);
                u.stats = s.data;
            } catch(e) {}
        }));

        enrichedData.value = results;
    } catch (error) {
        console.error("Erro DashZap:", error);
    } finally {
        loading.value = false;
    }
};

// --- LÓGICA DE FILTRAGEM ---
const rankingGeral = computed(() => [...enrichedData.value].sort((a, b) => b.msgTotalGeral - a.msgTotalGeral).slice(0, 20));

const rankingPeriodo = computed(() => {
    const start = new Date(dateStart.value + "T00:00:00");
    const end = new Date(dateEnd.value + "T23:59:59");
    return enrichedData.value.map(user => {
        const countInRange = user.history.filter(msg => {
            const dataMsg = new Date(msg.dataEnvio);
            return dataMsg >= start && dataMsg <= end;
        }).length;
        return { ...user, msgNoPeriodo: countInRange };
    })
    .filter(u => u.msgNoPeriodo > 0)
    .sort((a, b) => b.msgNoPeriodo - a.msgNoPeriodo);
});

// --- TOOLTIPS ---
const tooltipConfig = {
    callbacks: {
        label: (item) => {
            const isGeral = item.dataset.label === 'Geral';
            const user = isGeral ? rankingGeral.value[item.dataIndex] : rankingPeriodo.value[item.dataIndex];
            const lines = [
                `📧 Email: ${user.email}`,
                `📞 Fone: ${user.phone_number || 'N/D'}`,
                `🏢 CNPJ: ${user['custom:cnpj'] || 'N/D'}`,
                `💎 Plano: ${user['custom:plano'] || 'N/D'}`,
                `✅ Status: ${user.Enabled ? 'Ativo' : 'Bloqueado'}`,
                `🚀 ENVIOS: ${item.raw}`
            ];
            if (isGeral && user.stats) {
                lines.push(`--- ESTATÍSTICAS ---`);
                lines.push(`📩 Enviados: ${user.stats.ENVIADO}`);
                lines.push(`👁️ Visualizados: ${user.stats.VISUALIZADO}`);
                lines.push(`❌ Falhas: ${user.stats.FALHA}`);
            }
            return lines;
        }
    }
};

const chartOptions = (type) => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipConfig },
    onClick: (e, elements) => {
        if (elements.length > 0 && type === 'periodo') {
            openSingleSend(rankingPeriodo.value[elements[0].index]);
        }
    }
});

const chartGeralData = computed(() => ({
    labels: rankingGeral.value.map(u => u.name || u.Username),
    datasets: [{ label: 'Geral', data: rankingGeral.value.map(u => u.msgTotalGeral), backgroundColor: '#94a3b8', borderRadius: 4 }]
}));

const chartPeriodoData = computed(() => ({
    labels: rankingPeriodo.value.map(u => u.name || u.Username),
    datasets: [{ label: 'No Período', data: rankingPeriodo.value.map(u => u.msgNoPeriodo), backgroundColor: '#f97316', borderRadius: 4 }]
}));

const openSingleSend = (user) => {
    formSingle.value = {
        name: user.name || 'Cliente',
        rawPhone: user.phone_number || '',
        phone: sanitizePhone(user.phone_number),
        userToken: user.Username,
        message: 'Olá $name, a LUBCONSULTA deseja a você um excelente dia, conte sempre conosco.'
    };
    showSingleModal.value = true;
};

const execSingleSend = async () => {
    sendingMessage.value = true;
    try {
        const msgFinal = formatMessage(formSingle.value.message, formSingle.value.name);
        await axios.get(`https://api.lubzap.lubconsulta.com.br/sendzap?token=${formSingle.value.userToken}&whatsapp=${formSingle.value.phone}&message=${encodeURIComponent(msgFinal)}`);
        alert("Enviado!");
        showSingleModal.value = false;
    } catch (e) { alert("Erro!"); }
    finally { sendingMessage.value = false; }
};

const execBulkSend = async () => {
    if(!confirm(`Enviar para ${rankingPeriodo.value.length} usuários?`)) return;
    bulkStatus.value = { active: true, current: 0, total: rankingPeriodo.value.length, name: '', logs: [] };
    for (let i = 0; i < rankingPeriodo.value.length; i++) {
        const user = rankingPeriodo.value[i];
        bulkStatus.value.current = i + 1;
        bulkStatus.value.name = user.name;
        try {
            const phone = sanitizePhone(user.phone_number);
            const msg = formatMessage(formBulk.value.message, user.name);
            await axios.get(`https://api.lubzap.lubconsulta.com.br/sendzap?token=${user.Username}&whatsapp=${phone}&message=${encodeURIComponent(msg)}`);
        } catch (e) {}
        await delay(2000);
        if ((i + 1) % 20 === 0) await delay(6000);
    }
    bulkStatus.value.active = false;
    showBulkModal.value = false;
};

onMounted(initDashboard);
</script>

<template>
    <div class="dashboard-wrapper p-4">
        <!-- HEADER -->
        <div class="card border-0 shadow-sm mb-4 p-3 bg-white">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h5 class="fw-bold m-0 d-flex align-items-center gap-2">
                        <Zap class="text-warning" fill="currentColor" :size="24"/> 
                        TRÁFEGO LUBZAP MULTIFUNCIONAL
                    </h5>
                    <p class="text-muted small m-0">Análise de Fluxo e Disparos Ativos</p>
                </div>
                <div class="col-md-6 text-end">
                    <div v-if="loading" class="d-inline-block me-3 text-start" style="width: 150px;">
                        <small class="fw-bold text-primary">Sincronizando: {{ progress }}%</small>
                        <div class="progress" style="height: 6px;"><div class="progress-bar progress-bar-animated bg-primary" :style="{width: progress + '%'}"></div></div>
                    </div>
                    <button class="btn btn-orange-soft shadow-sm" @click="initDashboard" :disabled="loading">
                        <RefreshCw :size="18" :class="{'rotate': loading}" class="me-1"/> Sincronizar
                    </button>
                </div>
            </div>
        </div>

        <!-- FILTROS -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm p-3 bg-dark text-white">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-3">
                            <CalendarIcon :size="20" class="text-warning"/>
                            <input type="date" class="form-control form-control-sm bg-secondary text-white border-0" v-model="dateStart">
                            <ArrowRight :size="16" class="text-muted"/>
                            <input type="date" class="form-control form-control-sm bg-secondary text-white border-0" v-model="dateEnd">
                        </div>
                        <button class="btn btn-outline-warning btn-sm d-flex align-items-center gap-2 px-3 fw-bold" @click="showBulkModal = true">
                            <MessageSquareDashed :size="18"/> DISPARO EM MASSA
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- GRÁFICOS -->
        <div class="row g-4">
            <div class="col-lg-6">
                <div class="card border-0 shadow-sm bg-white p-4">
                    <h6 class="fw-bold text-muted text-uppercase mb-3">🏆 Ranking Geral (Top 20)</h6>
                    <div class="chart-h-500"><Bar v-if="!loading" :data="chartGeralData" :options="chartOptions('geral')" /></div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="card border-0 shadow-sm bg-white p-4">
                    <h6 class="fw-bold text-orange text-uppercase mb-3">🔥 Atividade no Período</h6>
                    <div class="scroll-chart-wrapper">
                        <div :style="{ height: (rankingPeriodo.length * 38) + 'px', minHeight: '500px' }">
                            <Bar v-if="!loading" :data="chartPeriodoData" :options="chartOptions('periodo')" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- LISTAGEM DETALHADA -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white p-3 border-bottom">
                        <h6 class="fw-bold m-0 text-muted text-uppercase">Listagem Detalhada</h6>
                    </div>
                    <div class="table-responsive" style="max-height: 400px;">
                        <table class="table table-hover table-sm mb-0">
                            <thead class="bg-light sticky-top">
                                <tr class="small text-muted text-uppercase">
                                    <th class="ps-4 py-3">Usuário</th>
                                    <th>Plano</th>
                                    <th class="text-center">Total Geral</th>
                                    <th class="text-end pe-4">No Período</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="u in rankingPeriodo" :key="u.Username" class="align-middle">
                                    <td class="ps-4 py-2">
                                        <a href="#" @click.prevent="openSingleSend(u)" class="text-decoration-none hover-link">
                                            <div class="fw-bold text-primary">{{ u.name || 'Sem Nome' }}</div>
                                            <div class="text-muted extra-small">{{ u.email }}</div>
                                        </a>
                                    </td>
                                    <td><span class="badge bg-light text-dark border">{{ u['custom:plano'] }}</span></td>
                                    <td class="text-center text-muted">{{ u.msgTotalGeral }}</td>
                                    <td class="text-end pe-4 fw-bold text-orange fs-5">{{ u.msgNoPeriodo }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL ÚNICO -->
        <div v-if="showSingleModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header bg-primary text-white border-0">
                    <h6 class="m-0 d-flex align-items-center gap-2"><Send :size="18"/> Enviar Mensagem</h6>
                    <button class="btn-close btn-close-white" @click="showSingleModal = false"></button>
                </div>
                <div class="modal-body p-4 bg-white">
                    <div class="mb-3">
                        <label class="small fw-bold">NOME</label>
                        <input type="text" class="form-control" v-model="formSingle.name">
                    </div>
                    <div class="mb-3">
                        <label class="small fw-bold">WHATSAPP</label>
                        <input type="text" class="form-control" v-model="formSingle.phone">
                    </div>
                    <div class="mb-3">
                        <label class="small fw-bold">MENSAGEM</label>
                        <textarea class="form-control" rows="4" v-model="formSingle.message"></textarea>
                    </div>
                    <button class="btn btn-primary w-100 fw-bold" @click="execSingleSend" :disabled="sendingMessage">ENVIAR AGORA</button>
                </div>
            </div>
        </div>

        <!-- MODAL MASSA -->
        <div v-if="showBulkModal" class="modal-overlay">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header bg-dark text-white border-0">
                    <h6 class="m-0 d-flex align-items-center gap-2"><MessageSquareDashed :size="18"/> Disparo em Lote</h6>
                    <button class="btn-close btn-close-white" @click="showBulkModal = false"></button>
                </div>
                <div class="modal-body p-4 bg-white">
                    <textarea class="form-control mb-4" rows="4" v-model="formBulk.message"></textarea>
                    <div v-if="bulkStatus.active" class="mb-4">
                        <small class="fw-bold">Processando: {{ bulkStatus.name }}</small>
                        <div class="progress" style="height: 10px;"><div class="progress-bar bg-success" :style="{width: (bulkStatus.current / bulkStatus.total * 100) + '%'}"></div></div>
                    </div>
                    <button class="btn btn-warning w-100 fw-bold" @click="execBulkSend" :disabled="bulkStatus.active">INICIAR DISPAROS</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.dashboard-wrapper { background-color: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
.btn-orange-soft { background-color: #fff7ed; color: #f97316; border: 1px solid #ffedd5; font-weight: 700; border-radius: 8px; }
.text-orange { color: #f97316; }
.chart-h-500 { height: 500px; position: relative; }
.scroll-chart-wrapper { height: 500px; overflow-y: auto; padding-right: 10px; }
.scroll-chart-wrapper::-webkit-scrollbar { width: 6px; }
.scroll-chart-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(5px); }
.modal-content { background: white !important; border-radius: 20px; width: 95%; overflow: hidden; animation: zoomIn 0.25s ease-out; }
.modal-header, .modal-body { padding: 30px !important; }
.hover-link:hover .fw-bold { text-decoration: underline; color: #ea580c !important; }
.rotate { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes zoomIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.extra-small { font-size: 0.65rem; }
.progress { background-color: #e2e8f0; border-radius: 20px; overflow: hidden; }
</style>