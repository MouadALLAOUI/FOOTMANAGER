<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class MediaProxyController extends Controller
{
    /**
     * Proxies media assets (team logos, badges, images) with explicit CORS headers
     * to allow client-side canvas and HTML-to-image exports without canvas tainting.
     */
    public function proxy(Request $request): Response
    {
        $url = (string) $request->query('url', '');
        if ($url === '') {
            abort(400, 'Missing url query parameter');
        }

        // 1. Check if the URL points to our local public storage disk
        $storageIndex = strpos($url, '/storage/');
        if ($storageIndex !== false) {
            $relativePath = substr($url, $storageIndex + 9);
            $cleanPath = explode('?', $relativePath)[0];

            if (Storage::disk('public')->exists($cleanPath)) {
                $content = Storage::disk('public')->get($cleanPath);
                $mimeType = Storage::disk('public')->mimeType($cleanPath) ?: 'image/png';

                return response($content, 200, [
                    'Content-Type' => $mimeType,
                    'Access-Control-Allow-Origin' => '*',
                    'Access-Control-Allow-Methods' => 'GET, OPTIONS',
                    'Access-Control-Allow-Headers' => '*',
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                ]);
            }
        }

        // 2. Fallback: Fetch external image safely with timeout
        try {
            $cleanUrl = filter_var($url, FILTER_VALIDATE_URL);
            if (! $cleanUrl) {
                abort(400, 'Invalid URL format');
            }

            $fetchRes = Http::timeout(6)
                ->withHeaders([
                    'Accept' => 'image/*,*/*;q=0.8',
                    'User-Agent' => 'FootManager-MediaProxy/1.0',
                ])
                ->get($cleanUrl);

            if ($fetchRes->successful()) {
                $body = $fetchRes->body();
                $mimeType = $fetchRes->header('Content-Type') ?: 'image/png';

                return response($body, 200, [
                    'Content-Type' => $mimeType,
                    'Access-Control-Allow-Origin' => '*',
                    'Access-Control-Allow-Methods' => 'GET, OPTIONS',
                    'Access-Control-Allow-Headers' => '*',
                    'Cache-Control' => 'public, max-age=86400',
                ]);
            }
        } catch (\Throwable $e) {
            // Silently fall through to 404
        }

        abort(404, 'Image asset not accessible');
    }
}
