interface ApiConfig {
	jupiter: {
		priceUrl: string;
		timeout: number;
	};
	birdeye: {
		baseUrl: string;
		apiKey?: string;
		timeout: number;
	};
	useProxy: boolean;
}

const isDevelopment = import.meta.env.MODE === 'development';
const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

export const apiConfig: ApiConfig = {
	jupiter: {
		priceUrl: `${proxyUrl}/api/jupiter/price`, // Use proxy to fix DNS issues
		timeout: 5000,
	},
	birdeye: {
		baseUrl: isDevelopment
			? `${proxyUrl}/api/birdeye`
			: 'https://public-api.birdeye.so/public',
		apiKey: import.meta.env.VITE_BIRDEYE_API_KEY,
		timeout: 5000,
	},
	useProxy: true, // Always use proxy now
};

export async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retries: number = 3
): Promise<Response> {
	let lastError: Error | null = null;

	for (let i = 0; i < retries; i++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), apiConfig.jupiter.timeout);

			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				return response;
			}

			if (response.status === 404) {
				throw new Error(`API endpoint not found: ${url}`);
			}

			if (response.status >= 500) {
				lastError = new Error(`Server error: ${response.status}`);
				await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
				continue;
			}

			throw new Error(`API error: ${response.status} ${response.statusText}`);
		} catch (error: any) {
			if (error?.name === 'AbortError') {
				lastError = new Error('Request timeout');
			} else if (typeof error?.message === 'string' && error.message.includes('Failed to fetch')) {
				lastError = new Error('Network error - check connection or CORS settings');
			} else {
				lastError = error as Error;
			}

			if (i < retries - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
			}
		}
	}

	throw lastError || new Error('Unknown error occurred');
}

export async function getTokenPrices(tokenIds: string[]): Promise<any> {
	// Try proxy first, then fallback to direct API
	const urls = [
		`${apiConfig.jupiter.priceUrl}?ids=${encodeURIComponent(tokenIds.join(','))}`,
		`https://price.jup.ag/v6/price?ids=${encodeURIComponent(tokenIds.join(','))}`
	];
	
	for (const url of urls) {
		try {
			console.log(`🔄 Trying URL: ${url}`);
			const response = await fetchWithRetry(url);
			const data = await response.json();
			
			if (data && data.data && Object.keys(data.data).length > 0) {
				console.log(`✅ Success with URL: ${url}`);
				return data;
			}
		} catch (error: any) {
			console.warn(`⚠️ Failed with URL ${url}:`, error.message);
			continue;
		}
	}
	
	// All attempts failed
	return {
		data: {},
		error: 'All price API attempts failed',
		timestamp: Date.now(),
	};
} 