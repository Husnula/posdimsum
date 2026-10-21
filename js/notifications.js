/**
 * MODUL NOTIFIKASI MODERN (ANTI-ALERT BAWAAN)
 * 100% menggunakan SweetAlert2 dan Custom Floating Toast
 * DILARANG KERAS menggunakan alert(), confirm(), atau prompt() bawaan browser
 */

const Notifications = {
  /**
   * Menampilkan dialog sukses modern
   */
  async success(title, htmlContent, timer = 3000) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        icon: 'success',
        title: title,
        html: htmlContent || '',
        confirmButtonText: 'Selesai',
        confirmButtonColor: '#E03E1A',
        timer: timer > 0 ? timer : undefined,
        timerProgressBar: timer > 0,
        customClass: {
          popup: 'swal2-tf-popup',
          title: 'swal2-tf-title',
          confirmButton: 'swal2-tf-btn-primary'
        }
      });
    } else {
      this.toast(title, 'success');
    }
  },

  /**
   * Menampilkan dialog error / peringatan modern
   */
  async error(title, text) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        icon: 'error',
        title: title,
        text: text || '',
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#DC2626',
        customClass: {
          popup: 'swal2-tf-popup',
          title: 'swal2-tf-title',
          confirmButton: 'swal2-tf-btn-danger'
        }
      });
    } else {
      this.toast(title + ': ' + text, 'danger');
    }
  },

  /**
   * Menampilkan dialog konfirmasi menggantikan confirm()
   * Return: Promise<boolean> (true jika Ya, false jika Batal)
   */
  async confirm(title, text, confirmText = 'Ya, Lanjutkan', cancelText = 'Batal') {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        icon: 'question',
        title: title,
        text: text || '',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: '#E03E1A',
        cancelButtonColor: '#64748B',
        reverseButtons: true,
        customClass: {
          popup: 'swal2-tf-popup',
          title: 'swal2-tf-title',
          confirmButton: 'swal2-tf-btn-primary',
          cancelButton: 'swal2-tf-btn-secondary'
        }
      });
      return result.isConfirmed;
    }
    return false;
  },

  /**
   * Menampilkan dialog prompt input teks menggantikan prompt()
   * Return: Promise<string | null>
   */
  async prompt(title, placeholder = '', defaultValue = '') {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: title,
        input: 'text',
        inputValue: defaultValue,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#E03E1A',
        cancelButtonColor: '#64748B',
        customClass: {
          popup: 'swal2-tf-popup',
          title: 'swal2-tf-title',
          input: 'swal2-tf-input',
          confirmButton: 'swal2-tf-btn-primary',
          cancelButton: 'swal2-tf-btn-secondary'
        },
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return 'Input tidak boleh kosong!';
          }
        }
      });
      return result.isConfirmed ? result.value : null;
    }
    return null;
  },

  /**
   * Modal Upsell Eksklusif untuk Fitur yang Terkunci
   * Menghubungkan langsung ke WhatsApp Developer
   */
  async showUpgradeModal(featureName, featureDescription) {
    const devWa = APP_CONFIG.DEVELOPER_WA || '6288228511309';
    const message = encodeURIComponent(
      `Halo Developer, saya ingin upgrade fitur "${featureName}" pada aplikasi POS Teras Foodies. Mohon info biaya dan aktivasinya.`
    );
    const waUrl = `https://wa.me/${devWa}?text=${message}`;

    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: `<span style="color:#D97706; font-size:24px;">Fitur Eksklusif Pro</span>`,
        html: `
          <div style="text-align:center; padding:10px 0;">
            <div style="font-size:48px; margin-bottom:12px;">🔒</div>
            <h3 style="font-size:18px; margin:0 0 8px 0; color:#0F172A; font-weight:700;">${featureName}</h3>
            <p style="font-size:14px; color:#64748B; margin:0 0 16px 0; line-height:1.5;">${featureDescription}</p>
            <div style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:12px; padding:12px; font-size:13px; color:#B45309; text-align:left;">
              <strong>Keunggulan Upgrade:</strong>
              <ul style="margin:6px 0 0 0; padding-left:18px;">
                <li>Otomatisasi pembukuan gerai tanpa catat manual</li>
                <li>Pantau omzet dan laba bersih secara akurat</li>
                <li>Dukungan teknis prioritas langsung dari developer</li>
              </ul>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Hubungi Developer via WA',
        cancelButtonText: 'Nanti Dulu',
        confirmButtonColor: '#25D366',
        cancelButtonColor: '#94A3B8',
        customClass: {
          popup: 'swal2-tf-popup',
          confirmButton: 'swal2-tf-btn-whatsapp',
          cancelButton: 'swal2-tf-btn-secondary'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          window.open(waUrl, '_blank');
        }
      });
    }
  },

  /**
   * Menampilkan custom Toast melayang non-intrusif di pojok layar
   * Tipe: 'success', 'warning', 'danger', 'info'
   */
  toast(message, type = 'info', duration = 2500) {
    let container = document.getElementById('tf-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tf-toast-container';
      container.className = 'tf-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `tf-toast tf-toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
    } else if (type === 'danger') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    } else {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <div class="tf-toast-icon">${iconSvg}</div>
      <div class="tf-toast-message">${message}</div>
      <button class="tf-toast-close" aria-label="Tutup">&times;</button>
    `;

    container.appendChild(toast);

    // Animasi masuk
    requestAnimationFrame(() => {
      toast.classList.add('tf-toast-show');
    });

    const removeToast = () => {
      toast.classList.remove('tf-toast-show');
      toast.classList.add('tf-toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };

    toast.querySelector('.tf-toast-close').addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
  }
};
