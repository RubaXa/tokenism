import {
	LikeToken,
	TokenValueCompositeFactory,
	TokenValueFactory,
	Token,
	TokenExtra,
	TokenValueGen,
	TokenValueInfer,
	CompositeToken,
	TokenAny,
} from './token.types';

export function composeTokens<
	F extends LikeToken[],
	P extends object,
>(
	factory: (
		compose: <T extends LikeToken[]>(...t: T) => T,
		params: P,
	) => F,
): TokenValueCompositeFactory<F, P>;
export function composeTokens<T extends LikeToken[]>(...tokens: T): TokenValueCompositeFactory<T, null>;
export function composeTokens(...args: any): Function {
	if (!isLikeToken(args[0])) {
		const factory = args[0];
		const compose = (...tokens: any) => tokens;
		return defineProperties((params: object) => factory(compose, params), {
			composite: 2,
		});
	} else {
		return defineProperties(() => args, {
			composite: 1,
		});
	}
}

export function createToken<
	K extends string,
	C extends string,
	V extends TokenValueCompositeFactory<any, any>,
>(
	key: K,
	caption: C,
	value: V,
): CompositeToken<K, C, V>;
export function createToken<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
>(
	key: K,
	caption: C,
	value: V,
): Token<K, C, V>;
export function createToken(key: string, caption: string, value: any): Function {
	const extra = Object(this) as TokenExtra<string, any>;
	const getExtra = (other: TokenExtra<string, any> = {}) => ({
		caption,
		value,
		...extra,
		...other,
	});

	function token(nextCaption?: string, nextValue?: any) {
		return createToken.call(getExtra(), key, nextCaption, nextValue);
	}

	let lastValue: TokenValueInfer<any>;

	const optional = !!extra.optional;
	const getKey = () => key;
	const getCaption = () => caption || extra.caption;
	const getValue = (mode?: 'raw') => {
		lastValue = compute(value as any, extra.value, mode);
		return lastValue;
	};

	return defineProperties(token, {
		as: (key: string, nextCaption?: string, nextValue?: TokenValueFactory) => {
			return createToken.call(getExtra({}), key, nextCaption, nextValue);
		},
		optional: (nextCaption?: string, nextValue?: TokenValueFactory) => {
			return createToken.call(getExtra({optional: true}), key, nextCaption, nextValue);
		},
		key: getKey,
		caption: getCaption,
		value: () => getValue(),
		lastValue: () => lastValue,
		toJSON: () => {
			let val = getValue('raw');

			return {
				name: getKey(),
				value: val,
				optional,
				caption: getCaption(),
				type: typeOf(val),
			};
		},
	}) as any; // todo!!!
}

function defineProperties<T extends object, P extends object>(obj: T, props: P): T & P {
	const map = Object.keys(props).reduce((descr, key) => {
		descr[key] = {
			writable: false,
			configurable: false,
			value: props[key],
		};

		return descr;
	}, {} as PropertyDescriptorMap)

	Object.defineProperties(obj, map);

	return obj as T & P;
}

function isTokenValueGen(val: unknown): val is TokenValueGen {
	return typeof val === 'function';
}

function compute<
	V extends TokenValueFactory | TokenValueCompositeFactory<any, any>,
	I extends TokenValueFactory | TokenValueCompositeFactory<any, any>,
	R extends TokenValueInfer<any>, // todo: -any
>(
	value: V,
	initial?: I,
	mode?: 'raw',
): R {
	if (isTokenValueCompositeFactory(value)) {
		return computeComposite(value, null, mode) as any; // todo: -any
	}

	if (isTokenValueCompositeFactory(initial)) {
		return computeComposite(initial, value, mode) as any; // todo: -any
	}

	const valueFactory = value as TokenValueFactory;
	const initialFactory = initial as TokenValueFactory;

	let val = (isTokenValueGen(valueFactory) ? compute(valueFactory()) : valueFactory) as R;

	if (isTokenValueGen(initialFactory)) {
		if (!/^\(\)/.test(initialFactory.toString())) {
			val = compute(val == null ? initialFactory() : initialFactory(val));
		} else if (val == null) {
			val = compute(initialFactory());
		}
	} else if (val == null) {
		val = initialFactory as any; // todo: -any
	}

	if (Array.isArray(val)) {
		return val.map((v: any) => {
			if (isToken(v)) {
				return mode === 'raw' ? v.toJSON() : v.value();
			}
			return v;
		})
	}

	return val;
}

function computeComposite(
	factory: TokenValueCompositeFactory<any, any>,
	params?: any,
	mode?: 'raw',
): object {
	const useParams = factory.composite === 2;
	const tokens = factory(useParams ? Object(params) : null);
	const result = {};

	for (let token of tokens) {
		if (isToken(token)) {
			const key = token.key();

			if (useParams) {
				result[key] = mode === 'raw' ? token.toJSON() : token.value();
			} else {
				const val = params && params[key] || null;
				const t = val ? token(null, val) : token;
				result[key] = mode === 'raw' ? t.toJSON() : t.value();
			}
		}
	}

	return result;
}

function typeOf(val: unknown) {
	let type = val === null ? 'null' : typeof val;
	return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function isLikeToken(val: unknown): val is LikeToken {
	return typeof val === 'function' && typeof val['as'] === 'function';
}

function isToken(val: unknown): val is Token<any, any, any> {
	return isLikeToken(val);
}

function isTokenValueCompositeFactory(val: unknown): val is TokenValueCompositeFactory<any, any> {
	if (typeof val === 'function') {
		return !!val['composite'];
	}

	return false;
}
