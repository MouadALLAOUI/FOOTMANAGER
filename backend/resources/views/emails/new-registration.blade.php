<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلب تسجيل جديد</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:28px 24px;text-align:center;">
                            <div style="font-size:28px;line-height:1;">⚽</div>
                            <h1 style="margin:12px 0 4px;color:#ffffff;font-size:22px;font-weight:700;">طلب تسجيل جديد</h1>
                            <p style="margin:0;color:#d1fae5;font-size:14px;">{{ $type === 'terrain_owner' ? 'صاحب تيران' : 'مسير فريق' }} — بانتظار موافقتك</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px;">
                            <p style="margin:0 0 20px;color:#111827;font-size:15px;line-height:1.8;">مرحباً، تم تسجيل حساب جديد على المنصة بانتظار مراجعتك وموافقتك. إليك تفاصيل الطلب:</p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="background-color:#f9fafb;padding:12px 16px;width:38%;font-size:13px;color:#6b7280;">الاسم</td>
                                    <td style="background-color:#ffffff;padding:12px 16px;font-size:14px;color:#111827;font-weight:600;">{{ $name }}</td>
                                </tr>
                                <tr>
                                    <td style="background-color:#f9fafb;padding:12px 16px;font-size:13px;color:#6b7280;">رقم الهاتف</td>
                                    <td style="background-color:#ffffff;padding:12px 16px;font-size:14px;color:#111827;" dir="ltr" align="right">{{ $phone }}</td>
                                </tr>
                                @if($email)
                                <tr>
                                    <td style="background-color:#f9fafb;padding:12px 16px;font-size:13px;color:#6b7280;">البريد الإلكتروني</td>
                                    <td style="background-color:#ffffff;padding:12px 16px;font-size:14px;color:#111827;" dir="ltr" align="right">{{ $email }}</td>
                                </tr>
                                @endif
                                @if($teamName)
                                <tr>
                                    <td style="background-color:#f9fafb;padding:12px 16px;font-size:13px;color:#6b7280;">اسم الفريق</td>
                                    <td style="background-color:#ffffff;padding:12px 16px;font-size:14px;color:#111827;">{{ $teamName }}</td>
                                </tr>
                                @endif
                                @if($teamCategory)
                                <tr>
                                    <td style="background-color:#f9fafb;padding:12px 16px;font-size:13px;color:#6b7280;">فئة الفريق</td>
                                    <td style="background-color:#ffffff;padding:12px 16px;font-size:14px;color:#111827;">{{ $teamCategory }}</td>
                                </tr>
                                @endif
                            </table>

                            @if($approvalUrl)
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;width:100%;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $approvalUrl }}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">مراجعة الطلب واعتماده</a>
                                    </td>
                                </tr>
                            </table>
                            @endif

                            <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.8;text-align:center;">
                                يمكنك أيضاً الدخول إلى لوحة الإدارة من المنصة لمراجعة جميع الطلبات المعلقة.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
