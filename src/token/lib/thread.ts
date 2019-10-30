import { rand } from './random';

export const gen = {
	id: () => `${rand(0, 1)}:${rand().toString(16)}:${rand(0, 100)}`,
	flags: {
		unread: () => Math.random() > .5,
		pinned: () => Math.random() > .5,
	},
};

export default <const>['Тред', {
	id: ['Идентификатор треда', gen.id],
	flags: ['Флаги треда', {
		unread: ['Признак прочитанности', gen.flags.unread],
		pinned: ['Прикреплённое письмо', gen.flags.pinned],
	}],
}];