<template>
  <footer class="base-footer">
    <div class="footer-container">
      <div class="footer-left">
        <div class="footer-brand">
          <img src="@/assets/logo.png" alt="MLSphere Logo" class="footer-logo">
          <span class="footer-text">MLSphere</span>
        </div>
        <span class="footer-tagline">Visual ML Pipeline Creator</span>
      </div>
      
      <div class="footer-center">
        <a href="#" class="footer-link">Documentation</a>
        <span class="footer-separator">|</span>
        <a href="#" class="footer-link">GitHub</a>
        <span class="footer-separator">|</span>
        <a href="#" class="footer-link">Support</a>
      </div>
      
      <div class="footer-right">
        <span class="footer-copy">&copy; {{ currentYear }} MLSphere</span>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'BaseFooter',
  computed: {
    currentYear() {
      return new Date().getFullYear();
    }
  }
};
</script>

<style scoped>
.base-footer {
  border-top: 1px solid rgba(100, 116, 139, 0.2);
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  backdrop-filter: blur(12px);
  padding: 20px 40px;
  z-index: 10;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  filter: brightness(1.1);
}

.footer-text {
  color: #f1f5f9;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.footer-tagline {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  margin-left: 34px;
}

.footer-center {
  display: flex;
  align-items: center;
  gap: 16px;
}

.footer-link {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.footer-link:hover {
  color: #a0d468;
}

.footer-separator {
  color: #475569;
  font-size: 12px;
}

.footer-right {
  display: flex;
  align-items: center;
}

.footer-copy {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .footer-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }
  
  .footer-left {
    align-items: center;
  }
  
  .footer-tagline {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .base-footer {
    padding: 16px 20px;
  }
  
  .footer-center {
    gap: 12px;
  }
  
  .footer-link,
  .footer-separator {
    font-size: 12px;
  }
}
</style>
