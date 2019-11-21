type TokenValuePrimitive = string | boolean | number;
type TokenValue =
	| string
	| boolean
	| number
	| TokenValuePrimitive[]
	| LikeToken[]
;

export type TokenValueGen = (...args: any[]) => TokenValue;
export type TokenValueCompositeFactory<
	T extends LikeToken[]
> = (() => T) & {composite: number};

export type TokenValueFactory =
	| TokenValue
	| TokenValueGen
;

export type TokenValueInfer<T extends TokenValueFactory> = T extends () => infer R ? R : T;

type TokenValueTypedFactory<
	V extends TokenValueFactory,
	T = TokenValueInfer<V>,
> = T | ((...args: any[]) => T);

type TokenJSON<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
> = {
	key: K;
	param: string;
	optional: boolean;
	comment: C;
	value: TokenValueInfer<V>;
	type: string;
}

type TokenFactory<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
> = <
	NC extends string | null,
	NV extends TokenValueFactory | null
>(comment?: NC, value?: NV) => Token<K, Strict<NC, C>, Strict<NV, V>>;

export type Token<
	K extends string,
	C extends string,
	V extends TokenValueFactory,
> = TokenFactory<K, C, V> & {
	as: <
		P extends string,
		NC extends string = C,
		NV extends TokenValueFactory = V,
	>(param: P, comment?: string, value?: TokenValueTypedFactory<V>) => Token<P, NC, NV>;

	optional: <
		NC extends string = C,
		NV extends TokenValueFactory = V,
	>(comment?: string, value?: TokenValueTypedFactory<V>) => Token<K, NC, NV>;

	key: () => K;
	comment: () => C;
	value: () => TokenValueInfer<V>;
	lastValue: () => TokenValueInfer<V>;
	param: () => string;
	toJSON: () => TokenJSON<K, C, V>;
};

type CompositeTokenFactory<
	K extends string,
	C extends string,
	V extends TokenValueCompositeFactory<any>,
> = <
	NC extends string | null,
>(comment?: NC, value?: CompositeTokenParams<V>) => CompositeToken<K, Strict<NC, C>, V>;

export type CompositeToken<
	K extends string,
	C extends string,
	V extends TokenValueCompositeFactory<any>,
> = CompositeTokenFactory<K, C, V> & {
	as: <
		P extends string,
		NC extends string | null,
	>(param: P, comment?: NC, value?: CompositeTokenParams<V>) => CompositeToken<P, Strict<NC, C>, V>;
	optional: <NC extends string = C>(comment?: string,) => CompositeToken<K, NC, V>;
	key: () => K;
	comment: () => C;
	value: () => V;
	lastValue: () => V;
	param: () => string;
	toJSON: () => object;
};

export type TokenAny = Token<any, any, any>;
export type LikeToken = {key: () => string; value: () => any};

export type TokenExtra<
	C extends string,
	V extends TokenValueFactory,
> = {
	composite?: boolean;
	optional?: boolean;
	param?: string;
	comment?: C;
	value?: V;
}

export type CastToTokenValueFactory<
	F extends TokenValueFactory | TokenValueCompositeFactory<any>,
> = (
	F extends TokenValueCompositeFactory<infer T>
		? TokenCompositeValue<T>
		: F
);

type CompositeTokenParam<F> = F extends TokenValueCompositeFactory<infer T>
	? TokenCompositeValue<T>
	: F
;

export type CompositeTokenParams<F> = DeepPartial<
	Cast<
		CompositeTokenParam<F>,
		object
	>
>;

export type TokenCompositeValue<T extends LikeToken[]> = (
	FlattenObject<
		ToIntersect<
			{[K in keyof T]:
				T[K] extends {key: () => infer KK, value: () => infer VV}
					? { [P in Cast<KK, string>]: CompositeTokenParam<VV> }
					: never
			}[number]
		>
	>
);

// (1) Union to Intersection (as result: {foo: 123} & {bar: 321} & ...)
type ToIntersect<U> =
	(U extends any ? (inp: U) => void : never) extends ((out: infer I) => void)
		? I
		: never
;

// (2) Make flat object again! ({foo: 123} & {bar: 321} -> {foo: 123; bar: 321})
type FlattenObject<T> = (
	T extends object
		? { [K in keyof T]: T[K] }
		: never
);

type IsNullable<T> = ToIntersect<T> extends (undefined | null) ? true : false;
type Cast<A, E> = A extends E ? A : E;
type Strict<A, E> = NonNullable<IsNullable<A> extends true ? E : A>;
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;