import axios from "axios";
import crypto from "crypto";
import config from "../../config.json" assert { type: "json" };

export default class YMoney {    
    #shopId = config.YMoney.shopID;
    #secretKey = config.YMoney.secretKey;
    #authToken = Buffer.from(`${this.#shopId}:${this.#secretKey}`).toString('base64');

    async payment(request, money, description) {
        const data = {
            amount: {
                value: money ? money : '100',
                currency: 'RUB'
            },
            confirmation: {
                type: 'redirect',
                return_url: `https://${config.hostname}/`
            },
            description: description ? description : 'Описание платежа',
            metadata: {
                shopId: this.#shopId,
                steamID: request.cookies.steamID
            },
            capture: false
        };

        try {
            const response = await axios.post('https://api.yookassa.ru/v3/payments', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${this.#authToken}`,
                    'Idempotence-Key': crypto.randomBytes(16).toString('hex')
                }
            });
            return response.data;
        } catch (error) {
            console.error('Ошибка создания платежа:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async notificationPayment(request) {
        const body = request.body;
        
        if (body.object && body.object.metadata && body.object.metadata.shopId == this.#shopId) {
            if (body.event === 'payment.waiting_for_capture') {
                const payment = body.object;
                const data = {
                    amount: {
                        value: payment.amount.value,
                        currency: payment.amount.currency
                    }
                };
                try {
                    const response = await axios.post(`https://api.yookassa.ru/v3/payments/${payment.id}/capture`, data, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Basic ${this.#authToken}`,
                            'Idempotence-Key': crypto.randomBytes(16).toString('hex')
                        }
                    });
    
                    if (response.data.status == 'succeeded') {
                        //TODO: сделать выдачу привилеги после получение платежа
                        console.log('Платеж получен:', response.data);
                        
                    }
                } catch (error) {
                    console.error('Ошибка при получении платежа:', error.response ? error.response.data : error.message);
                    throw error;
                }
                return { status: 200, message: 'OK' };
            }
        }
        return { status: 400, message: 'Недействительный платёж' };
    }
}
