<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  LayoutDashboard, UploadCloud, ChevronDown, Circle,
  Edit, MessageSquare, HelpCircle, LogOut, Users, MessageCircle, Send, Phone, PhoneCall
} from 'lucide-vue-next';

import { chatState } from '../chatState';

const router = useRouter();
const route = useRoute();
const expandedMenu = ref(null);

const navigateTo = (path) => router.push(path);
const toggleMenu = (menuKey) => expandedMenu.value = expandedMenu.value === menuKey ? null : menuKey;
// const handleLogout = () => router.push('/login');
const handleLogout = () => {
  localStorage.removeItem('authToken'); // <--- Limpa o token
  router.push('/login');
};

// Lógica para manter os menus abertos ao recarregar a página
watch(route, (newRoute) => {
  // Se estiver na raiz '/' ou em subrotas de dashboard, expande o Dashboard
  if (newRoute.path === '/' || newRoute.path.includes('/dashboard/')) {
    expandedMenu.value = 'dashboard';
  }
  if (newRoute.path.includes('/importacao/')) expandedMenu.value = 'importacoes';
  if (newRoute.path.includes('/cadastros/')) expandedMenu.value = 'cadastros';
}, { immediate: true });
</script>

<template>
  <nav class="d-flex flex-column p-3 h-100">
    <div class="d-flex align-items-center mb-4 px-2 mt-2">
      <div class=" p-1 d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; font-weight: bold;"><img src="/log.png" alt="Logo" style="width: 32px; height: 32px;"></div>
      <img src="/lu.png" alt="Logo" style="width: 150px; height: 20px;">
    </div>

    <div class="flex-grow-1 overflow-auto hide-scrollbar">
      <small class="text-uppercase text-muted fw-bold ps-2" style="font-size: 0.75rem;">Menu</small>
      <ul class="nav flex-column mt-2 gap-1">
        
        <!-- === 1. DASHBOARD (AGORA COM SUBMENUS) === -->
        <li class="nav-item">
          <a 
            href="#" 
            class="nav-link d-flex justify-content-between align-items-center"
            :class="{ 'text-dark bg-light': expandedMenu === 'dashboard' }"
            @click.prevent="toggleMenu('dashboard')"
          >
            <div class="d-flex align-items-center gap-2">
              <LayoutDashboard :size="20" /> 
              <span>Dashboard</span>
            </div>
            <ChevronDown :size="16" class="transition-transform" :class="{ 'rotate-180': expandedMenu === 'dashboard' }" />
          </a>

          <!-- Submenus do Dashboard -->
          <div v-show="expandedMenu === 'dashboard'" class="mt-1 ps-3">
            <ul class="nav flex-column gap-1 border-start ms-2 ps-2">
              
              <!-- Região (Linka para a Home / Dashboard atual) -->
              <li class="nav-item">
                <a 
                  href="#" 
                  class="nav-link py-2" 
                  :class="{ 'active shadow-sm': route.path === '/' }" 
                  @click.prevent="navigateTo('/')"
                >
                  <Circle :size="8" :class="{ 'fill-current': route.path === '/' }" /> Região
                </a>
              </li>

              <!-- Marca (Futuro) -->
              <li class="nav-item">
                <a 
                  href="#" 
                  class="nav-link py-2" 
                  :class="{ 'active shadow-sm': route.path === '/dashboard/marca' }" 
                  @click.prevent="navigateTo('/dashboard/marca')"
                >
                  <Circle :size="8" :class="{ 'fill-current': route.path === '/dashboard/marca' }" /> Marca
                </a>
              </li>

              <!-- Frota (Futuro) -->
              <li class="nav-item">
                <a 
                  href="#" 
                  class="nav-link py-2" 
                  :class="{ 'active shadow-sm': route.path === '/dashboard/frota' }" 
                  @click.prevent="navigateTo('/dashboard/frota')"
                >
                  <Circle :size="8" :class="{ 'fill-current': route.path === '/dashboard/frota' }" /> Frota
                </a>
              </li>

            </ul>
          </div>
        </li>

        <!-- === 2. IMPORTAÇÕES === -->
        <li class="nav-item">
          <a href="#" class="nav-link d-flex justify-content-between align-items-center" :class="{ 'text-dark bg-light': expandedMenu === 'importacoes' }" @click.prevent="toggleMenu('importacoes')">
            <div class="d-flex align-items-center gap-2"><UploadCloud :size="20" /> <span>Importações</span></div>
            <ChevronDown :size="16" class="transition-transform" :class="{ 'rotate-180': expandedMenu === 'importacoes' }" />
          </a>
          <div v-show="expandedMenu === 'importacoes'" class="mt-1 ps-3">
             <ul class="nav flex-column gap-1 border-start ms-2 ps-2">
                <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/importacao/fipe' }" @click.prevent="navigateTo('/importacao/fipe')"><Circle :size="8" :class="{ 'fill-current': route.path === '/importacao/fipe' }" /> Fipe</a></li>
                <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/importacao/lubrax' }" @click.prevent="navigateTo('/importacao/lubrax')"><Circle :size="8" :class="{ 'fill-current': route.path === '/importacao/lubrax' }" /> Lubrax</a></li>
                <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/importacao/regioes' }" @click.prevent="navigateTo('/importacao/regioes')"><Circle :size="8" :class="{ 'fill-current': route.path === '/importacao/regioes' }" /> Regiões</a></li>
                <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/importacao/veiculos' }" @click.prevent="navigateTo('/importacao/veiculos')"><Circle :size="8" :class="{ 'fill-current': route.path === '/importacao/veiculos' }" /> Veículos</a></li>
                <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/importacao/frotas' }" @click.prevent="navigateTo('/importacao/frotas')"><Circle :size="8" :class="{ 'fill-current': route.path === '/importacao/frotas' }" /> Frotas</a></li>
             </ul>
          </div>
        </li>

        <!-- === 3. CADASTROS === -->
        <li class="nav-item">
          <a href="#" class="nav-link d-flex justify-content-between align-items-center" :class="{ 'text-dark bg-light': expandedMenu === 'cadastros' }" @click.prevent="toggleMenu('cadastros')">
            <div class="d-flex align-items-center gap-2"><Edit :size="20" /> <span>Cadastros</span></div>
            <ChevronDown :size="16" class="transition-transform" :class="{ 'rotate-180': expandedMenu === 'cadastros' }" />
          </a>
          <div v-show="expandedMenu === 'cadastros'" class="mt-1 ps-3">
            <ul class="nav flex-column gap-1 border-start ms-2 ps-2">
              <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/cadastros/fipe' }" @click.prevent="navigateTo('/cadastros/fipe')"><Circle :size="8" :class="{ 'fill-current': route.path === '/cadastros/fipe' }" /> Fipe</a></li>
              <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/cadastros/lubrax' }" @click.prevent="navigateTo('/cadastros/lubrax')"><Circle :size="8" :class="{ 'fill-current': route.path === '/cadastros/lubrax' }" /> Lubrax</a></li>
              <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/cadastros/regioes' }" @click.prevent="navigateTo('/cadastros/regioes')"><Circle :size="8" :class="{ 'fill-current': route.path === '/cadastros/regioes' }" /> Regiões</a></li>
              <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/cadastros/veiculos' }" @click.prevent="navigateTo('/cadastros/veiculos')"><Circle :size="8" :class="{ 'fill-current': route.path === '/cadastros/veiculos' }" /> Veículos</a></li>
              <li class="nav-item"><a href="#" class="nav-link py-2" :class="{ 'active shadow-sm': route.path === '/cadastros/frotas' }" @click.prevent="navigateTo('/cadastros/frotas')"><Circle :size="8" :class="{ 'fill-current': route.path === '/cadastros/frotas' }" /> Frotas</a></li>
            </ul>
          </div>
        </li>

        <!-- Ferramentas -->
        <li class="mt-4 mb-2 ps-2"><small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">Ferramentas</small></li>
        <!-- <li class="nav-item"><a href="#" class="nav-link"><MessageSquare :size="20" /> LubChat</a></li> -->
        <li class="nav-item">
          <a 
            href="#" 
            class="nav-link" 
            :class="{ 'active': route.path === '/lubchat' }" 
            @click.prevent="navigateTo('/lubchat')"
          >
            <MessageSquare :size="20" /> LubChat
          </a>
        </li>

        
        <!-- Configurações -->
        <li class="mt-4 mb-2 ps-2"><small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">Configurações</small></li>
        <li class="nav-item"><a href="#" class="nav-link"><Users :size="20" /> Usuários</a></li>
      </ul>
    </div>

    <div class="mt-auto border-top pt-3">
      <a href="#" class="nav-link mb-1"><HelpCircle :size="20" /> Ajuda</a>
      <a href="#" class="nav-link text-danger bg-red-subtle" @click.prevent="handleLogout"><LogOut :size="20" /> Sair</a>
    </div>
  </nav>
</template>

<style scoped>
.transition-transform { transition: transform 0.2s ease; }
.rotate-180 { transform: rotate(180deg); }
.hide-scrollbar::-webkit-scrollbar { width: 4px; }
.hide-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 4px; }
.fill-current { fill: currentColor; }
</style>