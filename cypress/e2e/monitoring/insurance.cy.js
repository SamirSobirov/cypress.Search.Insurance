describe('Insurance Product', () => {

  before(() => {
    // Чистим логи перед запуском
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow - Insurance with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // 1. ПЕРЕХВАТ API (RegExp для надежности)
    cy.intercept({ method: 'POST', url: /\/insurance\/offers/ }).as('insuranceSearch');

    // 2. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');

    // 3. ПЕРЕХОД В СТРАХОВКУ
    cy.visit('https://test.globaltravel.space/insurance');
    cy.url().should('include', '/insurance');

    // 4. КУДА (Турция)
    cy.get('.p-multiselect-label-container').should('be.visible').click();
    cy.get('.p-multiselect-item').contains('Турция').click({ force: true });
    cy.get('body').click(0,0); // Закрыть выпадашку

      // 4. ДАТЫ
    const dateDeparture = new Date();
    dateDeparture.setDate(dateDeparture.getDate() + 2);
    const dateReturn = new Date();
    dateReturn.setDate(dateReturn.getDate() + 3);

    cy.get('input#v-2').click({ force: true });
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dateDeparture.getDate()}$`))
      .click({ force: true });

    cy.get('input#v-3').click({ force: true });
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dateReturn.getDate()}$`))
      .click({ force: true });

    // 6. ВОЗРАСТ
    cy.get('input#v-5').should('be.visible').click({ force: true });
    cy.get('input[placeholder="Введите возраст"]')
      .should('be.visible')
      .clear()
      .type('25'); // Средний возраст для стабильности

    // 7. ПОИСК
    cy.get('button.form-btn').should('be.visible').click({ force: true });

    // 8. УМНАЯ ПРОВЕРКА API
    cy.wait('@insuranceSearch', { timeout: 60000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API Insurance: HTTP ${statusCode}`);
      }
    });

    // Ожидание рендеринга карточек (в страховке они бывают тяжелые)
    cy.wait(10000);

    // 9. ПОДСЧЕТ РЕАЛЬНЫХ ОФФЕРОВ В UI
    cy.get('body').then(($body) => {
      // Ищем элементы страховки (обычно это .offer-card или подобные)
      // Добавляем селекторы, которые могут встречаться в страховке
      const cards = $body.find('[class*="offer"], .insurance-card, .p-card');
      let realOffers = 0;

      cards.each((index, el) => {
        const text = Cypress.$(el).text();
        // Считаем только те, где есть валюта или кнопка выбора
        if (text.includes('UZS') || text.includes('сум') || text.includes('Выбрать') || text.includes('Купить')) {
          realOffers++;
        }
      });

      if (realOffers > 0) {
        cy.writeFile('offers_count.txt', realOffers.toString());
        cy.log(`✅ Найдено страховых планов: ${realOffers}`);
      } else {
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ Страховых планов не найдено');
      }
    });
  });
});


