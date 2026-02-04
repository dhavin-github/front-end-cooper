// Mock Payment Gateway Service (FInternet)

class PaymentGatewayService {
    constructor() {
        this.apiKey = process.env.PAYMENT_GATEWAY_KEY || 'mock_key';
    }

    async collectFunds(userId, amount, eventId) {
        // Mock external API call
        console.log(`[Gateway] Collecting $${amount} from User ${userId} for Event ${eventId}`);

        // Simulate network delay and success
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (amount > 10000) return reject(new Error('Gateway Limit Exceeded'));
                resolve({ transactionId: `txn_col_${Date.now()}_${userId}`, status: 'SUCCESS' });
            }, 500);
        });
    }

    async refundFunds(userId, amount, eventId) {
        console.log(`[Gateway] Refunding $${amount} to User ${userId} for Event ${eventId}`);

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ transactionId: `txn_ref_${Date.now()}_${userId}`, status: 'SUCCESS' });
            }, 500);
        });
    }

    async releaseFunds(eventId, amount, recipient) {
        console.log(`[Gateway] Releasing $${amount} from Pool ${eventId} to Merchant ${recipient}`);
        return Promise.resolve({ success: true });
    }
}

module.exports = new PaymentGatewayService();
