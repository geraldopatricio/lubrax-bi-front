<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { 
  Search, Send, Smartphone, CheckCircle, 
  AlertCircle, Loader2, RefreshCw, Users, Clock, Trash2, MessageSquare, UserCheck, X
} from 'lucide-vue-next';
import axios from 'axios';
import { io } from 'socket.io-client';

// =============================================================================
// CONFIGURAÇÕES DE API E AMBIENTE
// =============================================================================
const BASE_URL = 'https://api.lubzap.lubconsulta.com.br';
// Prioriza a URL do env, se não houver usa a padrão
const API_PERFIL_URL = import.meta.env.VITE_API_URL || 'https://api.lubzap.lubconsulta.com.br';
const apiHeaders = { 
  'Content-Type': 'application/json', 
  'x-api-key': import.meta.env.VITE_API_KEY 
};

// =============================================================================
// ESTADOS (REFS)
// =============================================================================

// --- Conexão WhatsApp ---
const tokenInput = ref(''); // Nome da Sessão / Session ID
const qrCodeBase64 = ref(null);
const statusMessage = ref('');
const isLoadingConn = ref(false);
const currentStatus = ref('');
const socket = ref(null);
const showResultArea = ref(false);

// --- Dados dos Perfis (DynamoDB) ---
const perfis = ref([]); 
const isLoadingPerfis = ref(false);

// --- Controle de UI ---
const toast = ref({ show: false, msg: '', type: 'success' });
const showModalProgresso = ref(false);
const statusEnvio = ref('inativo'); // 'processando', 'pausado', 'concluido'
const mensagemProgresso = ref('');
const resumoEnvio = ref({ total: 0, sucesso: 0, erro: 0 });

// --- Mensagem em Massa ---
const mensagemTexto = ref(
`Lembrete LUBCONSULTA

Olá, [Nome do Cliente], tudo bem?

Com intuito de melhorar a qualidade de nossos serviços identificamos que sua conexão em nosso servidor está Off-Line.

Favor conectar-se para continuar usufruindo dos benefícios exclusivos para você!

Atenciosamente,
LUBCONSULTA Equipe de Suporte`
);

// --- Envio de Teste Individual ---
const manualPhone = ref('');
const manualMessage = ref('Teste de conexão Lubconsulta: Mensagem individual enviada com sucesso!');
const isLoadingManual = ref(false);

// =============================================================================
// UTILITÁRIOS E COMPUTED
// =============================================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isConnected = computed(() => ['CONNECTED', 'inChat'].includes(currentStatus.value));

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

// =============================================================================
// LÓGICA DE NEGÓCIO: BUSCA DE PERFIS
// =============================================================================

const fetchPerfis = async () => {
  isLoadingPerfis.value = true;
  try {
    const response = await fetch(`${API_PERFIL_URL}/perfilempresa`, { 
      method: 'GET', 
      headers: apiHeaders 
    });
    const data = await response.json();
    perfis.value = data || [];
  } catch (error) {
    showToast('Erro ao carregar lista de perfis do banco.', 'error');
  } finally {
    isLoadingPerfis.value = false;
  }
};

// =============================================================================
// LÓGICA DE NEGÓCIO: CONEXÃO WPPCONNECT
// =============================================================================

const setupWebSocketListeners = () => {
  socket.value = io(BASE_URL, { transports: ['websocket'], upgrade: false });

  socket.value.on('qrcode_update', (data) => {
    if (data.token === tokenInput.value) {
      isLoadingConn.value = false;
      qrCodeBase64.value = data.qrcode;
      statusMessage.value = 'QR Code gerado! Escaneie agora.';
    }
  });

  socket.value.on('status_update_session', (data) => {
    if (data.token === tokenInput.value) {
      currentStatus.value = data.status;
      if (isConnected.value) {
        isLoadingConn.value = false;
        qrCodeBase64.value = null;
        statusMessage.value = 'WhatsApp Conectado!';
      } else if (data.status === 'CLOSED' || data.status === 'DISCONNECTED') {
        isLoadingConn.value = false;
        qrCodeBase64.value = null;
      }
    }
  });
};

const handleAction = async () => {
  if (!tokenInput.value) return;
  isLoadingConn.value = true;
  showResultArea.value = true;
  qrCodeBase64.value = null;
  statusMessage.value = 'Consultando servidor...';

  try {
    const check = await axios.get(`${BASE_URL}/status/${tokenInput.value}`);
    currentStatus.value = check.data.status;
    
    if (!isConnected.value) {
      startConnection();
    } else {
      isLoadingConn.value = false;
      statusMessage.value = 'Conectado';
    }
  } catch (error) {
    startConnection();
  }
};

const startConnection = async () => {
  statusMessage.value = 'Iniciando navegador no servidor...';
  try {
    await axios.post(`${BASE_URL}/start/${tokenInput.value}`);
  } catch (error) {
    isLoadingConn.value = false;
    statusMessage.value = 'Erro ao contatar o backend.';
    showToast('Erro ao iniciar instância.', 'error');
  }
};

const reconnectInstance = async () => {
  if (!confirm(`Deseja forçar a desconexão e limpeza da sessão ${tokenInput.value}?`)) return;
  isLoadingConn.value = true;
  showResultArea.value = true;
  statusMessage.value = 'Limpando cache do servidor...';
  try {
    await axios.post(`${BASE_URL}/reconnect/${tokenInput.value}`);
    setTimeout(() => startConnection(), 2000);
  } catch (e) {
    startConnection();
  }
};

// =============================================================================
// LÓGICA DE NEGÓCIO: DISPARO MANUAL (TESTE)
// =============================================================================

const enviarTesteManual = async () => {
  if (!isConnected.value) return showToast("Conecte o WhatsApp primeiro!", "error");
  if (!manualPhone.value) return showToast("Informe o número de telefone!", "error");

  isLoadingManual.value = true;
  try {
    const foneLimpo = manualPhone.value.replace(/\D/g, '');
    await axios.post(`${BASE_URL}/sendzap/${tokenInput.value}`, {
      number: foneLimpo,
      message: manualMessage.value
    });
    showToast("Mensagem de teste enviada com sucesso!");
  } catch (err) {
    showToast("Erro ao enviar teste individual.", "error");
  } finally {
    isLoadingManual.value = false;
  }
};

// =============================================================================
// LÓGICA DE NEGÓCIO: DISPARO EM MASSA (COM DELAYS ANTI-SPAM)
// =============================================================================

const dispararMensagens = async () => {
  if (!isConnected.value) return showToast("Conecte o WhatsApp primeiro.", "error");
  
  // Atualiza lista antes de começar
  await fetchPerfis();
  if (perfis.value.length === 0) return showToast("Nenhum cliente encontrado na base.", "error");

  showModalProgresso.value = true;
  statusEnvio.value = 'processando';
  resumoEnvio.value = { total: perfis.value.length, sucesso: 0, erro: 0 };

  for (let i = 0; i < perfis.value.length; i++) {
    const perfil = perfis.value[i];
    const numeroAtual = i + 1;

    try {
      mensagemProgresso.value = `Processando: ${numeroAtual} de ${perfis.value.length}...`;
      
      const foneLimpo = perfil.telefone ? perfil.telefone.replace(/\D/g, '') : '';
      if (foneLimpo.length < 10) throw new Error("Número Inválido");

      // Substituição dinâmica: Prioriza Fantasia, senão Razão Social (nome)
      const nomeCliente = perfil.fantasia || perfil.nome || 'Cliente';
      const mensagemFinal = mensagemTexto.value.replace('[Nome do Cliente]', nomeCliente);

      // Chamada ao SendZap
      await axios.post(`${BASE_URL}/sendzap/${tokenInput.value}`, {
        number: foneLimpo,
        message: mensagemFinal
      });

      resumoEnvio.value.sucesso++;
    } catch (err) {
      console.error("Erro no envio individual:", err);
      resumoEnvio.value.erro++;
    }

    // --- LÓGICA DE INTERVALOS (ANTI-BLOQUEIO) ---
    if (numeroAtual < perfis.value.length) {
      // A cada 10 mensagens, pausa 30 segundos
      if (numeroAtual % 10 === 0) {
        statusEnvio.value = 'pausado';
        mensagemProgresso.value = `Pausa de segurança: 30 segundos para evitar bloqueio...`;
        await sleep(30000);
        statusEnvio.value = 'processando';
      } else {
        // Intervalo padrão de 3 segundos entre mensagens
        mensagemProgresso.value = `Aguardando intervalo de 3s...`;
        await sleep(3000);
      }
    }
  }

  statusEnvio.value = 'concluido';
};

// =============================================================================
// LIFECYCLE HOOKS
// =============================================================================

onMounted(() => {
  setupWebSocketListeners();
  fetchPerfis(); // Carrega a base ao abrir
});

onBeforeUnmount(() => {
  if (socket.value) socket.value.disconnect();
});
</script>

<template>
  <div class="container p-4 position-relative">
    
    <!-- TOAST DE NOTIFICAÇÃO -->
    <Transition name="fade">
      <div v-if="toast.show" :class="['toast-custom shadow-lg', toast.type === 'success' ? 'bg-success' : 'bg-danger']">
         {{ toast.msg }}
      </div>
    </Transition>

    <h4 class="fw-bold text-dark mb-4">Enviar aviso aos Clientes pela Lubconsulta</h4>

    <div class="row g-4">
      
      <!-- COLUNA DA ESQUERDA: INSTÂNCIA E TESTE -->
      <div class="col-md-5">
        
        <!-- CARD 1: GESTÃO DA CONEXÃO -->
        <div class="card border-0 shadow-sm p-4 mb-4">
          <label class="fw-bold mb-2 small text-muted text-uppercase">1. Gestão de Instância</label>
          
          <div class="input-group mb-3">
            <span class="input-group-text bg-light border-end-0"><Smartphone :size="18"/></span>
            <input 
                type="text" 
                class="form-control border-start-0" 
                v-model="tokenInput" 
                placeholder="Nome da Sessão (UserId)"
                :disabled="isLoadingConn"
            >
          </div>

          <div class="row g-2 mb-3">
            <div class="col-8">
                <button class="btn btn-primary w-100 text-white fw-bold d-flex align-items-center justify-content-center gap-2" 
                    @click="handleAction" :disabled="!tokenInput || isLoadingConn">
                    <Loader2 v-if="isLoadingConn" class="spinner" :size="18" />
                    <RefreshCw v-else :size="18" />
                    {{ isConnected ? 'Status: Conectado' : 'Conectar WhatsApp' }}
                </button>
            </div>
            <div class="col-4">
                <button class="btn btn-outline-danger w-100 fw-bold" 
                    title="Reiniciar Instância"
                    @click="reconnectInstance" :disabled="!tokenInput || isLoadingConn">
                    <Trash2 :size="18" />
                </button>
            </div>
          </div>

          <!-- ÁREA DE RESULTADO (QR CODE OU STATUS) -->
          <div v-if="showResultArea" class="qr-container border rounded p-3 text-center bg-light">
            <div v-if="isLoadingConn && !qrCodeBase64">
                <Loader2 class="spinner text-primary mb-2" :size="32" />
                <p class="small text-muted mb-0">{{ statusMessage }}</p>
            </div>

            <div v-else-if="qrCodeBase64">
                <p class="fw-bold small mb-2 text-primary">Leia o QR Code abaixo</p>
                <img :src="qrCodeBase64" class="img-fluid rounded shadow-sm mb-2" style="max-width: 180px;">
                <p class="x-small text-muted px-2 italic">A sessão será ativada automaticamente após a leitura.</p>
            </div>

            <div v-else-if="isConnected">
                <CheckCircle class="text-success mb-2" :size="40" />
                <div class="fw-bold text-success small">Sessão Ativa e Pronta</div>
                <div class="x-small text-muted">ID: {{ tokenInput }}</div>
            </div>

            <div v-else>
                <AlertCircle class="text-warning mb-1" :size="24" />
                <p class="small mb-0 text-muted">{{ statusMessage || 'Desconectado' }}</p>
            </div>
          </div>
        </div>

        <!-- CARD 2: TESTE INDIVIDUAL -->
        <div class="card border-0 shadow-sm p-4">
          <label class="fw-bold mb-2 small text-muted text-uppercase">2. Envio de Teste Individual</label>
          <p class="x-small text-muted mb-3 italic">Valide sua conexão enviando uma mensagem para um número específico.</p>
          
          <div class="mb-3">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-light border-end-0"><UserCheck :size="16"/></span>
              <input type="text" class="form-control border-start-0" v-model="manualPhone" placeholder="DDD + Número (ex: 11999999999)">
            </div>
          </div>
          
          <textarea class="form-control form-control-sm mb-3" rows="3" v-model="manualMessage" placeholder="Mensagem de teste..."></textarea>
          
          <button class="btn btn-outline-primary btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-2" 
            @click="enviarTesteManual" :disabled="!isConnected || isLoadingManual">
            <Loader2 v-if="isLoadingManual" class="spinner" :size="14" />
            <Send v-else :size="14"/> Enviar Teste Único
          </button>
        </div>

      </div>

      <!-- COLUNA DA DIREITA: DISPARO EM MASSA -->
      <div class="col-md-7">
        <div class="card border-0 shadow-sm p-4 h-100">
          <label class="fw-bold mb-2 small text-muted text-uppercase">3. Template de Mensagem (Massa)</label>
          <textarea class="form-control mb-3" rows="12" v-model="mensagemTexto"></textarea>
          
          <div class="d-flex flex-wrap gap-2 mb-4">
            <code class="small text-primary p-2 bg-orange-subtle border border-orange rounded shadow-sm">[Nome do Cliente]</code>
            <span class="badge bg-light text-muted border d-flex align-items-center px-3 shadow-sm">Loja: LUBCONSULTA</span>
          </div>

          <button class="btn btn-primary btn-lg w-100 text-white fw-bold d-flex align-items-center justify-content-center gap-2 shadow" 
            :disabled="!isConnected || perfis.length === 0 || statusEnvio === 'processando'" @click="dispararMensagens">
            <Send :size="20"/> 
            {{ isConnected ? `Executar Disparos para ${perfis.length} perfis` : 'WhatsApp Desconectado' }}
          </button>

          <div class="mt-4 p-3 bg-orange-subtle rounded border border-orange d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <Users class="text-primary" :size="20"/>
              <span class="small fw-bold">Clientes na Base (DynamoDB):</span>
            </div>
            <div v-if="isLoadingPerfis" class="spinner-border spinner-border-sm text-primary"></div>
            <span v-else class="badge bg-primary px-3 shadow-sm">{{ perfis.length }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL DE PROGRESSO E ANTI-SPAM -->
    <Transition name="fade">
      <div v-if="showModalProgresso" class="modal-overlay">
        <div class="modal-card card border-0 shadow-lg text-center p-5">
          
          <!-- ESTADO: EM PROCESSAMENTO OU PAUSADO -->
          <div v-if="statusEnvio !== 'concluido'">
            <div class="mb-3">
                <Loader2 v-if="statusEnvio === 'processando'" class="spinner text-primary" :size="50" />
                <Clock v-else class="text-warning pulse" :size="50" />
            </div>
            
            <h5 class="fw-bold mb-1">{{ statusEnvio === 'pausado' ? 'Pausa Anti-Spam' : 'Enviando Mensagens' }}</h5>
            <p class="text-muted small">{{ mensagemProgresso }}</p>
            
            <div class="progress my-4" style="height: 12px; border-radius: 10px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                     :style="{width: ((resumoEnvio.sucesso + resumoEnvio.erro) / resumoEnvio.total * 100) + '%'}"></div>
            </div>

            <div class="row g-2">
                <div class="col-6">
                    <div class="p-2 border rounded bg-light">
                        <div class="x-small text-muted">Sucesso</div>
                        <div class="fw-bold text-success h5 m-0">{{ resumoEnvio.sucesso }}</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-2 border rounded bg-light">
                        <div class="x-small text-muted">Falhas</div>
                        <div class="fw-bold text-danger h5 m-0">{{ resumoEnvio.erro }}</div>
                    </div>
                </div>
            </div>
          </div>

          <!-- ESTADO: FINALIZADO -->
          <div v-else>
            <CheckCircle class="text-success mb-3" :size="60" />
            <h5 class="fw-bold">Processo Finalizado!</h5>
            <p class="text-muted small">O disparo em massa foi concluído seguindo as regras de segurança.</p>
            
            <div class="row mt-4 bg-light p-3 rounded-3 g-0 border">
              <div class="col-4 border-end">
                <div class="h4 fw-bold m-0">{{ resumoEnvio.total }}</div>
                <div class="x-small text-muted">TOTAL</div>
              </div>
              <div class="col-4 border-end">
                <div class="h4 fw-bold text-success m-0">{{ resumoEnvio.sucesso }}</div>
                <div class="x-small text-muted">SUCESSO</div>
              </div>
              <div class="col-4">
                <div class="h4 fw-bold text-danger m-0">{{ resumoEnvio.erro }}</div>
                <div class="x-small text-muted">ERROS</div>
              </div>
            </div>
            <button class="btn btn-primary mt-5 w-100 py-2 fw-bold text-white shadow" @click="showModalProgresso = false">
              Fechar Relatório
            </button>
          </div>

        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* CORES LUBZAP / LUBOCONSULTA */
.text-primary { color: #f97316 !important; }
.bg-primary { background-color: #f97316 !important; }
.btn-primary { background-color: #f97316; border-color: #f97316; }
.btn-primary:hover { background-color: #ea580c; border-color: #ea580c; }
.btn-outline-primary { color: #f97316; border-color: #f97316; }
.btn-outline-primary:hover { background-color: #f97316; color: white; }
.btn-outline-danger { color: #dc3545; border-color: #dc3545; }
.btn-outline-danger:hover { background-color: #dc3545; color: white; }
.bg-orange-subtle { background-color: #fff7ed; }
.border-orange { border-color: #fdba74 !important; }

/* LAYOUT E MODAL */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal-card { width: 92%; max-width: 440px; border-radius: 28px; }

/* ANIMAÇÕES */
.spinner { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.pulse { animation: pulse-animation 2s infinite; }
@keyframes pulse-animation { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }

.qr-container { min-height: 180px; display: flex; flex-direction: column; justify-content: center; align-items: center; }

.toast-custom { 
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
  padding: 12px 30px; border-radius: 50px; color: white; z-index: 3000; font-weight: bold;
}

/* TIPOGRAFIA */
.x-small { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.6px; }
code { background: #fff1f2; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-family: monospace; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>