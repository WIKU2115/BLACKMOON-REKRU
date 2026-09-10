document.addEventListener('DOMContentLoaded', () => {
  const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1542637486491172914/4GSB1lCzN73U8TfQsXkIPnDnn1Xt9-c4Iz81VUX-7ArsFzxZbtLyNY-E2JYmRcSOWtuM';
  const form = document.querySelector('.application-form');
  const consentBanner = document.getElementById('consentBanner');
  const consentAccept = document.getElementById('consentAccept');
  const consentDecline = document.getElementById('consentDecline');
  const submitButton = document.getElementById('submitButton');
  const modalOverlay = document.getElementById('formModal');
  const modalBox = document.getElementById('modalBox');
  const modalTitle = document.getElementById('modalTitle');
  const modalText = document.getElementById('modalText');
  const modalButton = document.getElementById('modalButton');

  let consentAccepted = false;

  const openModal = (type, title, text) => {
    modalBox.classList.remove('modal--error', 'modal--success');
    modalBox.classList.add(type === 'success' ? 'modal--success' : 'modal--error');

    modalTitle.textContent = title;
    modalText.textContent = text;
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('visible');
  };

  const closeModal = () => {
    modalOverlay.classList.remove('visible');
    modalOverlay.classList.add('hidden');
  };

  const setConsentState = (isAccepted) => {
    consentAccepted = isAccepted;

    document.body.classList.toggle('consent-locked', !isAccepted);

    if (consentBanner) {
      consentBanner.classList.toggle('is-accepted', isAccepted);
    }

    if (consentAccept) {
      consentAccept.classList.toggle('is-confirmed', isAccepted);
    }

    if (submitButton) {
      submitButton.disabled = !isAccepted;
      submitButton.textContent = isAccepted ? 'WYŚLIJ PODANIE' : 'ZAAKCEPTUJ ZGODĘ ABY WYSŁAĆ PODANIE';
    }
  };

  const normalizeFieldName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getFieldLabel = (field, index) => {
    const visibleLabel = field.closest('label')?.querySelector('span')?.textContent?.trim();

    if (visibleLabel) {
      return visibleLabel;
    }

    const rawKey = field.name || `pole_${index + 1}`;
    const key = rawKey
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `pole_${index + 1}`;

    return normalizeFieldName(key);
  };

  const collectFormEntries = () => {
    const mainFields = [];
    const questionFields = [];

    Array.from(form.querySelectorAll('input, textarea')).forEach((field, index) => {
      const value = field.value.trim();

      if (!value) {
        return;
      }

      const fieldEntry = {
        name: getFieldLabel(field, index),
        value: value.length > 1000 ? `${value.slice(0, 997)}...` : value,
      };

      if (field.name) {
        mainFields.push(fieldEntry);
      } else {
        questionFields.push(fieldEntry);
      }
    });

    return { mainFields, questionFields };
  };

  const buildDiscordPayload = (entries) => {
    const mainEmbed = {
      title: '📝 Nowe podanie na mechanika',
      description:
        'Nowe zgłoszenie zostało wysłane z formularza rekrutacyjnego. Poniżej znajdziesz dane kandydata.',
      color: 0x1f9dff,
      thumbnail: {
        url: 'https://wiku2115.github.io/BLACKMOON-REKRU/logo.png',
      },
      author: {
        name: 'BlackMoon Rekrutacja',
        icon_url: 'https://wiku2115.github.io/BLACKMOON-REKRU/logo.png',
      },
      fields: entries.mainFields,
      footer: {
        text: 'BlackMoon • Rekrutacja',
        icon_url: 'https://wiku2115.github.io/BLACKMOON-REKRU/logo.png',
      },
      timestamp: new Date().toISOString(),
    };

    const embeds = [mainEmbed];

    if (entries.questionFields.length > 0) {
      embeds.push({
        title: '❓ Pytania rekrutacyjne',
        description: 'Poniżej znajdują się odpowiedzi kandydatów na pytania rekrutacyjne.',
        color: 0x5db1ff,
        fields: entries.questionFields,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      username: 'BlackMoon Rekrutacja',
      avatar_url: 'https://wiku2115.github.io/BLACKMOON-REKRU/logo.png',
      embeds,
    };
  };

  const sendToDiscord = async (entries) => {
    if (!DISCORD_WEBHOOK_URL) {
      throw new Error('Brakuje adresu webhook Discord. Wstaw poprawny URL w zmiennej DISCORD_WEBHOOK_URL.');
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildDiscordPayload(entries)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook zwrócił błąd ${response.status}${errorText ? `: ${errorText}` : ''}`);
    }
  };

  if (consentAccept) {
    consentAccept.addEventListener('click', () => setConsentState(true));
  }

  if (consentDecline) {
    consentDecline.addEventListener('click', () => setConsentState(false));
  }

  modalButton.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });

  setConsentState(false);

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const fields = [...form.querySelectorAll('input, textarea')];
      const hasEmptyField = fields.some((field) => field.value.trim() === '');

      if (!consentAccepted) {
        openModal(
          'error',
          'Brak zgody',
          'Aby wysłać podanie, musisz zaakceptować przetwarzanie danych osobowych.'
        );
        return;
      }

      if (hasEmptyField) {
        openModal(
          'error',
          'Uzupełnij formularz',
          'Podanie musi być całe uzupełnione przed wysłaniem.'
        );
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'WYSYŁANIE...';
      }

      try {
        const formEntries = collectFormEntries();
        await sendToDiscord(formEntries);

        openModal(
          'success',
          'Podanie zostało wysłane',
          'Podania będą sprawdzane niedziela/środa. Osoby które dostaną się na drugi etap dostaniecie info, IC ( SMS )'
        );

        form.reset();
      } catch (error) {
        openModal(
          'error',
          'Błąd wysyłki',
          error.message || 'Nie udało się wysłać podania do Discorda.'
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'WYŚLIJ PODANIE';
        }
      }
    });
  }
});
