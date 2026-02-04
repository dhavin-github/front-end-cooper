const axios = require('axios');
const https = require('https');

class FinternetService {
    constructor() {
        this.apiKey = process.env.FINTERNET_API_KEY;
        this.baseUrl = 'https://api.fmm.finternetlab.io';

        // Strict Requirement: Fail if no key (Enforced in app.js, but check here too)
        if (!this.apiKey) {
            console.error('[Finternet] FATAL: FINTERNET_API_KEY is missing.');
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), // In case of self-signed certs in lab
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Creates a Payment Intent via Real Finternet API
     */
    async createPaymentIntent(amount, currency = 'USD', metadata = {}) {
        if (!this.apiKey) throw new Error('FINTERNET_API_KEY is missing');

        // EXACT Structure required by user
        // Note: Amount usually needs to be string for financial APIs to avoid float precision issues, 
        // user example: "3000.00"

        const formattedAmount = Number(amount).toFixed(2);

        const payload = {
            amount: formattedAmount,
            currency: currency,
            type: "DELIVERY_VS_PAYMENT",
            settlementMethod: "OFF_RAMP_TO_RTP",
            settlementDestination: "9876543210", // Hardcoded per user request example structure
            metadata: {
                releaseType: "MILESTONE_LOCKED",
                ...metadata // Include our eventId/userId context
            }
        };

        console.log('[Finternet] 🚀 Creating intent with payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await this.client.post('/api/v1/payment-intents', payload);
            console.log('[Finternet] ✅ Intent Created:', response.data);

            // Return full response so caller can extract paymentUrl and intentId (id)
            // Expected: response.data.paymentUrl, response.data.id or response.data.paymentIntentId
            return response.data;

        } catch (err) {
            console.error('[Finternet] ❌ Create Failed:', err.response?.data || err.message);
            // Do NOT crash, just throw to be handled by route
            throw new Error(`Finternet API Error: ${JSON.stringify(err.response?.data || err.message)}`);
        }
    }

    /**
     * Confirms Payment by submitting Escrow Proof
     */
    async confirmPaymentIntent(intentId) {
        if (!this.apiKey) throw new Error('FINTERNET_API_KEY is missing');

        console.log(`[Finternet] 🚀 Confirming (Escrow Delivery) for Intent: ${intentId}`);

        // Required body for delivery proof submission
        const deliveryProof = {
            proofHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            proofURI: "https://example.com/delivery-proofs/ORD-123",
            submittedBy: "0x5D478B369769183F05b70bb7a609751c419b4c04"
        };

        try {
            // POST /api/v1/payment-intents/{intentId}/escrow/delivery-proof
            const response = await this.client.post(
                `/api/v1/payment-intents/${intentId}/escrow/delivery-proof`,
                deliveryProof
            );

            console.log('[Finternet] ✅ Confirmation (Proof) Accepted:', response.data);
            return response.data;

        } catch (err) {
            console.error('[Finternet] ❌ Confirmation Failed:', err.response?.data || err.message);
            throw new Error(`Finternet Confirmation Error: ${JSON.stringify(err.response?.data || err.message)}`);
        }
    }
}

module.exports = new FinternetService();
