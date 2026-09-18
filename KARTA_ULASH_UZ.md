# Kapital kartani ulash bo'yicha yo'riqnoma (UZ)

Botga pul to'g'ridan-to'g'ri kartaga **emas**, balki to'lov provayderi
(Payme / Click) orqali keladi. Provayder Visa/Mastercard kartalarini qabul qiladi
va pulni SIZNING kartangizga chiqaradi.

Botda bitta stavka ishlaydi:

```
Foydalanuvchi -> To'lov havolasi (Payme/Click/Visa) -> Sizning hisobingiz -> Sizning kartangiz
```

---

## 1. Payme orqali (Visa va Payme uchun)

1. **Ro'yxatdan o'tish**: https://business.payme.uz saytiga o'ting va ro'yxatdan o'ting
   (INN, pasport kerak bo'ladi).
2. **Kartani biriktirish**: sozlamalarda «Svyodka karta» (wyplata kartasi) bo'limiga
   o'zingizning **Visa** kartangizni qo'shing.
3. Balansdan pullar avtomatik yoki qo'lda kartangizga chiqariladi (odatda bir kun ichida).
4. Olingan kalitlarni `.env` fayliga yozing:

```
PAYME_MERCHANT_ID=chegirma-id-raqami
PAYME_KEY=buyurtma-kaliti
```

## 2. Click orqali

1. **Ro'yxatdan o'tish**: https://my.click.uz — «Tadbirkorga» bo'limi orqali merchant oching.
2. **Kartani biriktirish**: shaxsiy kabinetda to'lov kartangizni (Visa) qo'shing,
   chiqarish usulini tanlang.
3. Sozlamalarda quyidagi ma'lumotlarni olasiz:

```
CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_SECRET_KEY=
```

## 3. Webhook (so'nggi ishlatiladigan) sozlash

Payme va Click pullarni faqat **internetda ochiq bo'lgan HTTPS** manzilga yuboradi:

- Payme uchun: `https://SIZNING-DOMENINGIZ/webhooks/payme`
- Click uchun: `https://SIZNING-DOMENINGIZ/webhooks/click`

Agar bot kompyuterda (localhost) ishlaysa, tashqaridan ochiq bo'lishi kerak:
- Server (VPS) oling va botni o'sha yerda ishga tushiring, yoki
- ngrok kabi xizmat orqali HTTPS-manzil oling va domenni .env `SERVER_PORT=3000`
  bilan sozlang.

Bunday holda .env ichida:

```
SERVER_PORT=3000
```

## 4. .env faylini to'ldirish namunasi

```
BOT_TOKEN=asosiy-bot-token
NOTIFY_BOT_TOKEN=xabar-botni-token
NOTIFY_ADMIN_CHAT_ID=

DATABASE_URL=postgresql://user:password@localhost:5432/ytbot

PAYME_MERCHANT_ID=
PAYME_KEY=

CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_SECRET_KEY=

# Nakrutka (SMM) — real xizmat ulash uchun
SMM_API_URL=https://smm-panel-url/api/v2
SMM_API_KEY=
SMM_SERVICE_ID_YT_SUBS=
SMM_SERVICE_ID_YT_SUBS_VIP=
SMM_SERVICE_ID_YT_VIEWS=
SMM_SERVICE_ID_YT_LIKES=
```

## 5. Botni qayta ishga tushirish

Faylni o'zgartirgach (`.env`):

```
taskkill //IM node.exe //F
npm run dev
```

## 6. Tekshirish

1. @hubgwphfqiu_bot (xabar-boti)ga `/start` bosing — chat id eslab qolinadi.
2. Asosiy botda «💳 Balansni to'ldirish» -> Payme/Click/Visa tanlang -> summa kiriting.
3. Ochiq havola ochilganda va to'lov tugagach, xabar-botga bildirishnoma keladi,
   balans avtomatik to'ldiriladi.

---

**Eslatma**: Nakrutka (накрутка) real ishlashi uchun SMM-panel kerak.
Payme/Click kalitlari bo'lmasa to'lov havolalari ishlamaydi, balansni faqat
adminim `ADMIN_IDS` orqali topdirishi mumkin.