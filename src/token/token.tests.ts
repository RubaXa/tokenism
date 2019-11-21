import { createToken, composeTokens } from './token';

const agTokenGen = () => `AG_${Math.random().toString(16).split('.')[1]}`;
const agTokenCaption = 'Autogen-токен';
const agToken = createToken('agToken', agTokenCaption, agTokenGen);

describe('tokens', () => {
	it('typeof token', () => {
		expect(typeof agToken).toBe('function');
	});

	describe('default (required)', () => {
		it('key', () => {
			expect(agToken.key()).toBe('agToken');
			expect(agToken().key()).toBe('agToken');
		});

		it('caption', () => {
			expect(agToken.caption()).toBe(agTokenCaption);
			expect(agToken().caption()).toBe(agTokenCaption);
		});

		it('value', () => {
			expect(agToken.value()).toBe(agToken.lastValue());
			expect(agToken().value().split('_')[0]).toBe('AG');
		});

		it('as "token"', () => {
			const tok = agToken.as('token');

			expect(tok.caption()).toBe(agTokenCaption);
			expect(tok.toJSON()).toEqual(raw('token', agTokenCaption, 'String', tok.lastValue()));
		});

		it('as "regToken"', () => {
			const reg = agToken.as('regToken', 'Reg-токен');

			expect(reg.caption()).toBe('Reg-токен');
			expect(reg.toJSON()).toEqual(raw('regToken', 'Reg-токен', 'String', reg.lastValue()));
		});

		it('toJSON', () => {
			expect(agToken.toJSON()).toEqual(raw('agToken', agTokenCaption, 'String', agToken.lastValue()));
		});
	});

	describe('optional', () => {
		it('toJSON', () => {
			const opt = agToken.optional();
			expect(opt.toJSON()).toEqual(raw('agToken', agTokenCaption, 'String', opt.lastValue(), true));
		});
	});

	describe('invoke', () => {
		it('without args', () => {
			const tok = agToken();

			expect(tok).not.toBe(agToken);
		});

		it('with caption', () => {
			const sess = agToken('Сессия');

			expect(sess.caption()).toBe('Сессия');
			expect(sess.toJSON()).toEqual(raw('agToken', 'Сессия', 'String', sess.lastValue()));
		});

		it('with value', () => {
			const tok = agToken(null, 'tok');

			expect(tok.caption()).toBe(agTokenCaption);
			expect(tok.value()).toBe('tok');
			expect(tok.toJSON()).toEqual(raw('agToken', agTokenCaption, 'String', 'tok'));
		});

		it('with caption & value', () => {
			const reg = agToken('reg', 'tok');

			expect(reg.caption()).toBe('reg');
			expect(reg.value()).toBe('tok');
			expect(reg.toJSON()).toEqual(raw('agToken', 'reg', 'String', 'tok'));
		});
	});

	it('factory as value', () => {
		let cid = 0;
		let gen = () => `${++cid}`;
		expect(agToken(null, gen).value()).toBe('1');
		expect(agToken(null, gen).value()).toBe('2');
	});

	describe('composite', () => {
		const msgId = () => '43503050430523';
		const unreadFlag = () => false;
		const pinnedFlag = () => true;
		const message = createToken(
			'message',
			'Письмо',
			composeTokens(
				createToken('id', 'ID Письма', msgId),
				createToken('flags', 'Флаги Письма', composeTokens(
					createToken('unread', 'Прочитанность', unreadFlag),
					createToken('pinned', 'Прикреплённость', pinnedFlag),
				)),
			),
		);
		// const v = message(null)

		it('value', () => {
			expect(message.value()).toEqual({
				id: msgId(),
				flags: {
					unread: false,
					pinned: true,
				},
			});
		});

		it('toJSON', () => {
			expect(message.toJSON()).toEqual(raw('message', 'Письмо', 'Object', {
				id: raw('id', 'ID Письма', 'String', msgId()),
				flags: raw('flags', 'Флаги Письма', 'Object', {
					unread: raw('unread', 'Прочитанность', 'Boolean', false),
					pinned: raw('pinned', 'Прикреплённость', 'Boolean', true),
				}),
			}));
		});

		it('with values', () => {
			expect(message(null, {id: 'FAKE', flags: {unread: true}}).value()).toEqual({
				id: 'FAKE',
				flags: {
					unread: true,
					pinned: true,
				},
			});
		});

		describe('nested', () => {
			const threadId = () => '0:1234:5';
			const thread = createToken('thread', 'Тред', composeTokens(
				createToken('id', 'ID Треда', threadId),
				createToken('messages', 'Список писем', [
					message,
				]),
			));

			it('value', () => {
				expect(thread.value()).toEqual({
					id: threadId(),
					messages: [{id: msgId(), flags: {unread: false, pinned: true}}],
				});
			});
		});

		describe('configurable', () => {
			const genFalse = () => false;
			const oauthFlag = createToken('oauth', 'OAuth', genFalse);
			const hasPhoneFlag = createToken('has_phone', 'Has Phone', genFalse);
			const flags = createToken('flags', 'Флаги', composeTokens((compose, {all}: {all?: boolean}) => compose(
				oauthFlag(null, all),
				hasPhoneFlag(null, all),
			)));

			it('defaults', () => {
				expect(flags.value()).toEqual({
					oauth: false,
					has_phone: false,
				});
			});

			it('with params', () => {
				expect(flags(null, {all: true}).value()).toEqual({
					oauth: true,
					has_phone: true,
				});
			});
		});
	});
});

function raw(name: string, caption: string, type: string, value: any, optional: boolean = false) {
	return {
		caption,
		name,
		optional,
		type,
		value,
	};
}