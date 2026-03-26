import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors()); // Cho phép Website gọi tới Backend
app.use(express.json()); // Đọc dữ liệu JSON gửi lên

// Khởi tạo SDK OpenAI
const openai = new OpenAI({
    apiKey: "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f",
    baseURL: "https://9router.vuhai.io.vn/v1"
});

// Tạo một API (Endpoint) để Website gửi tin nhắn lên
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;

        const response = await openai.chat.completions.create({
            model: "ces-chatbot-gpt-5.4",
            messages: [
                { role: "system", content: "Bạn là một trợ lý AI thân thiện trên website." },
                { role: "user", content: userMessage }
            ],
        });

        // Gửi câu trả lời của Bot về lại Website
        res.json({ reply: response.choices[0].message.content });

    } catch (error) {
        console.error("Lỗi:", error);
        res.status(500).json({ error: "Lỗi nội bộ server" });
    }
});

// Chạy backend ở cổng 3000
app.listen(3000, () => {
    console.log("Chatbot Server đang chạy tại http://localhost:3000");
});
