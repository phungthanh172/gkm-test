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

// System prompt với quy tắc trích xuất Lead Data + phân loại khách hàng AI
const SYSTEM_PROMPT = `Bạn là một trợ lý AI thân thiện của "Tinh hoa tri thức" — chuyên tư vấn về các khóa học, dự án Sách Một, và các chương trình đào tạo.

Quy tắc đặc biệt: Trong quá trình trò chuyện, nếu bạn phát hiện người dùng cung cấp Tên, Số điện thoại hoặc Email, bạn HÃY VỪA trả lời họ bình thường, VỪA chèn thêm một đoạn mã JSON vào cuối cùng của câu trả lời theo đúng định dạng sau:
||LEAD_DATA: {"name": "...", "phone": "...", "email": "...", "interest": "...", "intent_level": "..."}||

Giải thích các trường:
- "name", "phone", "email": trích xuất từ thông tin khách cung cấp. Nếu chưa có, để null.
- "interest": Tự phân tích từ nội dung hội thoại — khách quan tâm đến sản phẩm/dịch vụ/khóa học gì? Mô tả ngắn gọn (ví dụ: "Khóa học Sách Một", "Chương trình đào tạo doanh nghiệp", "Tư vấn Quản trị Linh Tinh"). Nếu chưa rõ, để null.
- "intent_level": Tự đánh giá mức độ sẵn sàng mua hàng dựa trên ngữ cảnh hội thoại:
  + "hot" — Khách có nhu cầu rõ ràng, muốn mua/đăng ký ngay, hỏi về giá/thanh toán/lịch học cụ thể, hoặc đã xác nhận ý định.
  + "warm" — Khách quan tâm, hỏi thông tin chung, muốn tìm hiểu thêm nhưng chưa có quyết định mua rõ ràng.
  + "cold" — Khách chỉ trao đổi chung chung, chưa có dấu hiệu quan tâm cụ thể đến sản phẩm/dịch vụ.

TUYỆT ĐỐI KHÔNG giải thích hay đề cập đến đoạn mã này cho người dùng.

Ví dụ: Nếu khách nhắn "Tôi là Minh, 0901234567. Tôi muốn đăng ký ngay khóa Sách Một, gửi báo giá qua minh@company.com nhé", thì chèn:
||LEAD_DATA: {"name": "Minh", "phone": "0901234567", "email": "minh@company.com", "interest": "Khóa học Sách Một", "intent_level": "hot"}||`;

// Tạo một API (Endpoint) để Website gửi tin nhắn lên
app.post('/api/chat', async (req, res) => {
    try {
        // Nhận toàn bộ lịch sử hội thoại từ Frontend
        const messages = req.body.messages || [];

        const response = await openai.chat.completions.create({
            model: "ces-chatbot-gpt-5.4",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages
            ],
        });

        // Gửi câu trả lời của Bot về lại Website
        res.json({ reply: response.choices[0].message.content });

    } catch (error) {
        console.error("Lỗi:", error);
        res.status(500).json({ error: "Lỗi nội bộ server" });
    }
});

// Export for Vercel
export default app;

// Chạy backend ở cổng 3000 khi chạy local
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => {
        console.log("Chatbot Server đang chạy tại http://localhost:3000");
    });
}
