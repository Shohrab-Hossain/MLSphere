import { createRouter, createWebHistory } from 'vue-router';
import HomePageView from '../views/HomePageView.vue';
import PipelineView from '../views/PipelineView.vue';
import CodeEditorView from '../views/CodeEditorView.vue';
import AnalyticsView from '../views/AnalyticsView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePageView
  },
  {
    path: '/dashboard',
    redirect: '/'
  },
  {
    path: '/pipeline',
    name: 'pipeline',
    component: PipelineView
  },
  {
    path: '/code-editor',
    name: 'code-editor',
    component: CodeEditorView
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: AnalyticsView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'home' }
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;
