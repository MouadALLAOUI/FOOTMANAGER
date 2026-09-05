<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Models\Preset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PresetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Preset::query();

        if ($request->filled('category')) {
            $category = $request->string('category')->value();
            if (in_array($category, [Preset::CATEGORY_TEAM_LOGO, Preset::CATEGORY_PROFILE_AVATAR], true)) {
                $query->category($category);
            }
        }

        if ($request->filled('status')) {
            $status = $request->string('status')->value();
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'hidden') {
                $query->where('is_active', false);
            }
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->value();
            $query->where('name', 'like', "%{$search}%");
        }

        $query->ordered();

        $perPage = min(max((int) $request->input('per_page', 15), 1), 50);

        $presets = $query->paginate($perPage)->withQueryString();

        $presets->getCollection()->transform(fn (Preset $preset) => $this->payload($preset));

        return response()->json($presets);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'category' => 'required|in:team_logo,profile_avatar',
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $result = app(ImageThumbnailService::class)->storeWithThumbnail(
            $request->file('image'),
            'presets',
        );

        $sortOrder = isset($validated['sort_order']) && $validated['sort_order'] !== null
            ? (int) $validated['sort_order']
            : ((int) Preset::query()->where('category', $validated['category'])->max('sort_order')) + 1;

        $preset = Preset::query()->create([
            'name' => trim($validated['name']),
            'category' => $validated['category'],
            'image_path' => $result['path'],
            'image_thumbnail_path' => $result['thumbnail_path'],
            'is_active' => true,
            'sort_order' => $sortOrder,
        ]);

        return response()->json([
            'message' => 'تمت إضافة الصورة الجاهزة بنجاح',
            'preset' => $this->payload($preset),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $preset = Preset::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:120',
            'category' => 'sometimes|in:team_logo,profile_avatar',
            'image' => 'sometimes|image|mimes:jpeg,png,jpg,webp|max:4096',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $data = [
            'name' => isset($validated['name']) ? trim($validated['name']) : $preset->name,
            'category' => $validated['category'] ?? $preset->category,
            'sort_order' => (int) ($validated['sort_order'] ?? $preset->sort_order),
        ];

        if ($request->hasFile('image')) {
            $this->deleteFiles($preset);

            $result = app(ImageThumbnailService::class)->storeWithThumbnail(
                $request->file('image'),
                'presets',
            );

            $data['image_path'] = $result['path'];
            $data['image_thumbnail_path'] = $result['thumbnail_path'];
        }

        $preset->update($data);

        return response()->json([
            'message' => 'تم تحديث الصورة الجاهزة بنجاح',
            'preset' => $this->payload($preset),
        ]);
    }

    public function toggleActive(int $id): JsonResponse
    {
        $preset = Preset::findOrFail($id);
        $preset->update(['is_active' => ! $preset->is_active]);

        return response()->json([
            'message' => $preset->is_active ? 'تم إظهار الصورة الجاهزة بنجاح' : 'تم إخفاء الصورة الجاهزة بنجاح',
            'preset' => [
                'id' => $preset->id,
                'name' => $preset->name,
                'is_active' => $preset->is_active,
            ],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $preset = Preset::findOrFail($id);

        $this->deleteFiles($preset);

        $preset->delete();

        return response()->json([
            'message' => 'تم حذف الصورة الجاهزة بنجاح',
        ]);
    }

    private function deleteFiles(Preset $preset): void
    {
        foreach ([$preset->image_path, $preset->image_thumbnail_path] as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }

    private function payload(Preset $preset): array
    {
        return [
            'id' => $preset->id,
            'name' => $preset->name,
            'category' => $preset->category,
            'is_active' => $preset->is_active,
            'sort_order' => $preset->sort_order,
            'image_url' => $preset->image_url,
            'image_thumbnail_url' => $preset->image_thumbnail_url,
        ];
    }
}