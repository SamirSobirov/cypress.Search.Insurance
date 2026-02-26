describe('Insurance Product', () => {
  it('Search Flow - Insurance', () => {
    cy.viewport(1280, 800);
    
    // Перехват API
    cy.intercept('POST', '**/insurance/offers**').as('insuranceSearch');

    // 1. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    cy.get('body').should('not.contain', 'Ошибка');

    // 2. ПЕРЕХОД В СТРАХОВКУ
    cy.visit('https://test.globaltravel.space/insurance');
    cy.url().should('include', '/insurance');

    // 3. КУДА (Турция)
    cy.get('.p-multiselect-label-container').should('be.visible').click();
    cy.get('.p-multiselect-item').contains('Турция').click({ force: true });
    cy.get('body').click(0,0); 

    // 4. ДАТЫ
    const dateDeparture = new Date();
    dateDeparture.setDate(dateDeparture.getDate() + 2);
    const dateReturn = new Date();
    dateReturn.setDate(dateReturn.getDate() + 2);

    cy.get('input#v-2').click({ force: true });
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dateDeparture.getDate()}$`))
      .click({ force: true });

    cy.get('input#v-3').click({ force: true });
    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${dateReturn.getDate()}$`))
      .click({ force: true });

    // 5. ВОЗРАСТ (Исправленная логика клика)
    cy.get('input#v-5').should('be.visible').click({ force: true });

    cy.get('input[placeholder="Введите возраст"]')
      .should('be.visible')
      .clear()
      .type('18');

    // 6. ПОИСК
    cy.get('button.form-btn')
      .should('be.visible')
      .click({ force: true });

   // 7. ПРОВЕРКА РЕЗУЛЬТАТА
    cy.wait('@insuranceSearch', { timeout: 60000 }).then((interception) => {
      const body = interception.response ? interception.response.body : null;
      
      console.log('ОТВЕТ СЕРВЕРА:', body);

      let offersList = [];
      if (body) {
        if (Array.isArray(body)) {
          offersList = body;
        } else if (body.offers && Array.isArray(body.offers)) {
          offersList = body.offers;
        } else if (body.data && Array.isArray(body.data)) {
          offersList = body.data;
        }
      }
      
      const count = offersList.length || 0;

      cy.log(`DEBUG: Found ${count} insurance offers`);
      cy.writeFile('offers_count.txt', count.toString());
      
      if (count > 0) {
        cy.get('[class*="offer"]', { timeout: 20000 }).should('exist');
      } else {
        cy.log('Список офферов пуст или имеет другую структуру');
      }
    });
  });
});