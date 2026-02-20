import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Login from '../views/Login.vue'

// Importar as novas telas

// NOVOS CADASTROS
import Usuarios from '../views/cadastros/Usuarios.vue'; 
import Clientes from '../views/cadastros/Clientes.vue'; 
import Lubrificantes from '../views/cadastros/Lubrificantes.vue'; 
import MsgProgramada from '../views/cadastros/MsgProgramada.vue'; 
import Filtros from '../views/cadastros/Filtros.vue'; 
import Carros from '../views/cadastros/Carros.vue'; 
import dash_zaap from '../views/dashboard/dash_zaap.vue';
import ResetPassword from '../views/ResetPassword.vue'; 
import LubChat from '../views/LubChat.vue';
import MenusPage from '../views/configuracoes/MenusPage.vue'; 
import MsgClientePage from '../views/whatsapp/enviarMsgCliente.vue'; 
import PerfilEmpresa from '../views/cadastros/PerfilEmpresa.vue';
import MsgAtrasadas from '../views/whatsapp/recuperarAtrasados.vue';
import EnviarAvisos from '../views/whatsapp/enviarAvisos.vue';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresLayout: true }
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresLayout: false }
    },
    { 
      path: '/resetar-senha', 
      name: 'reset-password', 
      component: ResetPassword, 
      meta: { requiresLayout: false } 
    },
    { 
      path: '/configuracoes/menus', 
      name: 'menus', 
      component: MenusPage, 
      meta: { requiresLayout: true } 
    },
    // Rotas de Importação
    
    // NOVAS ROTAS DE CADASTRO (CRUD)
    { path: '/cadastros/usuarios', name: 'usuarios', component: Usuarios, meta: { requiresLayout: true } },
    { path: '/cadastros/clientes', name: 'clientes', component: Clientes, meta: { requiresLayout: true } },
    { path: '/cadastros/lubrificantes', name: 'lubrificantes', component: Lubrificantes, meta: { requiresLayout: true } },
    { path: '/cadastros/filtros', name: 'filtros', component: Filtros, meta: { requiresLayout: true } },
    { path: '/cadastros/carros', name: 'carros', component: Carros, meta: { requiresLayout: true } },,
    { path: '/cadastros/msgprogramada', name: 'msgprogramada', component: MsgProgramada, meta: { requiresLayout: true } },

    { path: '/dashboard/dash_zaap', name: 'dash_zaap', component: dash_zaap, meta: { requiresLayout: true } },    
    { path: '/lubchat', name: 'lubchat', component: LubChat, meta: { requiresLayout: true } },  
    { path: '/whatsapp/enviarmsgcliente', name: 'enviarmsgcliente', component: MsgClientePage, meta: { requiresLayout: true } },
    { path: '/cadastros/perfilempresa', name: 'perfilempresa', component: PerfilEmpresa, meta: { requiresLayout: true } },
    { path: '/whatsapp/msgatrasadas', name: 'msgatrasadas', component: MsgAtrasadas, meta: { requiresLayout: true } },
    { path: '/whatsapp/enviaravisos', name: 'enviaravisos', component: EnviarAvisos, meta: { requiresLayout: true } }

  ]
})


router.beforeEach((to, from, next) => {
  // Verifica se a rota precisa de layout (geralmente usamos isso para saber se é protegida)
  // Ou você pode verificar se o nome da rota NÃO é 'login'
  const isPublic = to.name === 'login';
  const isAuthenticated = localStorage.getItem('authToken'); // Verifica se tem token

  if (!isPublic && !isAuthenticated) {
    // Se não for pública e não tiver token, manda pro login
    next({ name: 'login' });
  } else if (isPublic && isAuthenticated) {
    // Se tentar ir pro login mas já tiver token, manda pro dashboard
    next({ name: 'dashboard' }); // ou '/'
  } else {
    // Segue normal
    next();
  }
});

export default router