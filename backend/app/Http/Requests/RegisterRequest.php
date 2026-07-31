<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email',
            'phone' => 'required|string|unique:users,phone|max:20',
            'is_whatsapp' => 'boolean',
            'password' => 'required|string|min:6',
            'team_name' => 'required|string|max:255',
            'member_count' => 'required|integer|min:1',
            'team_category' => 'required|in:adult,teenager,children',
            'association_name' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'الاسم مطلوب',
            'email.unique' => 'البريد الإلكتروني مسجل بالفعل',
            'phone.required' => 'رقم الهاتف مطلوب',
            'phone.unique' => 'رقم الهاتف مسجل بالفعل',
            'password.required' => 'كلمة المرور مطلوبة',
            'password.min' => 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
            'team_name.required' => 'اسم الفريق مطلوب',
            'member_count.required' => 'عدد أعضاء الفريق مطلوب',
            'member_count.min' => 'يجب أن يكون عدد الأعضاء 1 على الأقل',
            'team_category.required' => 'فئة الفريق مطلوبة',
            'team_category.in' => 'فئة الفريق غير صحيحة',
        ];
    }
}
