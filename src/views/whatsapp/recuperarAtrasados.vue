<script setup>
import { ref } from 'vue';
import { Search, Send, Mail, CheckCircle, AlertCircle, Loader2, History } from 'lucide-vue-next';

// Apontando para a nova API de atrasados
const API_ATRASADOS = "https://api.lubzap.lubconsulta.com.br/atrasados"; // Ajuste conforme seu DNS/Porta

const emailBusca = ref('');
const lojista = ref(null);
const isLoading = ref(false);
const toast = ref({ show: false, msg: '', type: 'success' });

const showModalProgresso = ref(false);
const statusEnvio = ref('inativo'); 
const resumoEnvio = ref({ total: 0, sucesso: 0, erro: 0 });

const mensagemTexto = ref(
`Lembrete [Nome da Loja]

Olá, [Nome do Cliente], tudo bem?

Identificamos que o seu veículo de placa [Placa] está próximo da [Nome do Serviço].

O descuido pode causar desgaste prematuro do motor. Manter a troca em dia garante mais economia e segurança.

Agende agora mesmo o serviço conosco!

[Endereço da Loja]`
);

const showToast = (msg, type) => {
  toast.value = { show: true, msg, type };
  setTimeout(() => toast.value.show = false, 4000);
};

const buscarLojista = async () => {
  if (!emailBusca.value) return;
  isLoading.value = true;
  lojista.value = null;
  try {
    const res = await fetch(`${API_ATRASADOS}/buscar-usuario?email=${emailBusca.value}`);
    const data = await res.json();
    if (data.userId) {
      lojista.value = data;
      showToast("Lojista localizado!", "success");
    } else {
      showToast("E-mail não encontrado.", "error");
    }
  } catch (e) {
    showToast("Erro na conexão.", "error");
  } finally { isLoading.value = false; }
};

const consultarStatus = async () => {
  try {
    const res = await fetch(`${API_ATRASADOS}/status-atrasados/${lojista.value.userId}?t=${Date.now()}`);
    const data = await res.json();

    // Atualiza os contadores na tela
    resumoEnvio.value.total = data.total || 0;
    resumoEnvio.value.sucesso = data.sucesso || 0;
    resumoEnvio.value.erro = data.erro || 0;
    resumoEnvio.value.atual = data.atual || 0; // Campo novo

    if (data.status === 'concluido') {
      statusEnvio.value = data.total === 0 ? 'vazio' : 'concluido';
      clearInterval(pollInterval.value);
    } else if (data.status === 'erro') {
      showModalProgresso.value = false;
      showToast("Erro: " + (data.erroMsg || "Falha no servidor"), "error");
      clearInterval(pollInterval.value);
    }
  } catch (e) { console.error(e); }
};

const pollInterval = ref(null);

const dispararAtrasados = async () => {
  if (!lojista.value) return;
  
  showModalProgresso.value = true;
  statusEnvio.value = 'processando';

  try {
    // 1. Manda o comando de iniciar
    const res = await fetch(`${API_ATRASADOS}/executar-envio-atrasados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: lojista.value.userId, mensagem: mensagemTexto.value })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // 2. Se o servidor aceitou, começamos a perguntar o status a cada 5 segundos
      pollInterval.value = setInterval(consultarStatus, 5000);
    } else { 
        throw new Error(); 
    }
  } catch (e) {
    showModalProgresso.value = false;
    showToast("Erro ao iniciar disparos.", "error");
  }
};

</script>

<template>
  <div class="container p-4">
    <div v-if="toast.show" :class="['toast-custom', toast.type === 'success' ? 'bg-success' : 'bg-danger']">
       {{ toast.msg }}
    </div>

    <div class="d-flex align-items-center mb-4">
        <History class="text-primary me-2" :size="28"/>
        <h4 class="fw-bold text-dark m-0">Recuperação de Mensagens Atrasadas</h4>
    </div>
    
    <div class="alert alert-warning border-0 shadow-sm mb-4">
        <strong>Atenção:</strong> Este script busca agendamentos com status "AGENDADO" dos <strong>últimos 60 dias</strong> que não foram enviados.
    </div>

    <div class="row g-4">
      <div class="col-md-5">
        <div class="card border-0 shadow-sm p-4">
          <label class="fw-bold mb-2 small text-muted">BUSCAR LOJISTA</label>
          <div class="input-group">
            <input type="email" class="form-control" v-model="emailBusca" placeholder="E-mail do lojista">
            <button class="btn btn-dark" @click="buscarLojista" :disabled="isLoading">
              <Search v-if="!isLoading" :size="18" />
              <Loader2 v-else class="spinner" :size="18" />
            </button>
          </div>
          <div v-if="lojista" class="mt-3 p-2 bg-light rounded border small">
             ID: {{ lojista.userId }}
          </div>
        </div>
      </div>

      <div class="col-md-7">
        <div class="card border-0 shadow-sm p-4">
          <label class="fw-bold mb-2 small text-muted">MENSAGEM DE RECUPERAÇÃO</label>
          <textarea class="form-control mb-3" rows="10" v-model="mensagemTexto"></textarea>
          
          <button class="btn btn-primary btn-lg w-100 text-white fw-bold" 
            :disabled="!lojista || statusEnvio === 'processando'" @click="dispararAtrasados">
            <Send class="me-2" :size="20"/> Disparar 60 Dias Atrás
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE PROGRESSO -->
    <Transition name="fade">
      <div v-if="showModalProgresso" class="modal-overlay">
        <div class="modal-card card border-0 shadow-lg text-center p-5">
          <!-- Procure este bloco no seu arquivo e substitua -->
          <div v-if="statusEnvio === 'processando'">
              <Loader2 class="spinner text-primary mb-3" :size="48" />
              <h5 class="fw-bold">Processando envios...</h5>
              
              <!-- NOVO: Contador de progresso -->
              <div class="my-3 py-2 bg-light rounded border">
                  <div class="small text-muted mb-1">PROGRESSO</div>
                  <div class="h3 fw-bold text-primary m-0">
                      {{ resumoEnvio.atual || 0 }} <span class="text-muted h6">/ {{ resumoEnvio.total || 0 }}</span>
                  </div>
              </div>

              <p class="text-muted small">
                  <span v-if="resumoEnvio.total === 0">Consultando banco de dados...</span>
                  <span v-else>Enviando 1 mensagem por minuto (anti-ban).</span>
              </p>
          </div>

          <div v-if="statusEnvio === 'concluido'">
            <CheckCircle class="text-success mb-3" :size="48" />
            <h5 class="fw-bold">Recuperação Finalizada!</h5>
            <div class="row mt-4">
              <div class="col-4">
                <div class="h3 fw-bold">{{ resumoEnvio.total }}</div>
                <div class="x-small text-muted">ATRASADOS</div>
              </div>
              <div class="col-4 border-start">
                <div class="h3 fw-bold text-success">{{ resumoEnvio.sucesso }}</div>
                <div class="x-small text-muted">ENVIADOS</div>
              </div>
              <div class="col-4 border-start">
                <div class="h3 fw-bold text-danger">{{ resumoEnvio.erro }}</div>
                <div class="x-small text-muted">ERROS</div>
              </div>
            </div>
            <button class="btn btn-primary mt-5 w-100" @click="showModalProgresso = false">Fechar</button>
          </div>

          <div v-if="statusEnvio === 'vazio'">
            <AlertCircle class="text-warning mb-3" :size="48" />
            <h5 class="fw-bold">Tudo em dia!</h5>
            <p class="text-muted">Não existem mensagens pendentes nos últimos 60 dias para este usuário.</p>
            <button class="btn btn-light border mt-4 w-100" @click="showModalProgresso = false">Voltar</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Copie o CSS do seu enviarMsgCliente.vue aqui para manter a identidade visual */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal-card { width: 90%; max-width: 450px; border-radius: 20px; }
.spinner { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.text-primary { color: #f97316 !important; }
.bg-primary { background-color: #f97316 !important; }
.toast-custom { 
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
  padding: 12px 25px; border-radius: 50px; color: white; z-index: 3000; font-weight: bold;
}
.x-small { font-size: 0.7rem; }
</style>