const users = [
  { id: 'u1', name: 'Ada Lovelace', role: 'admin' },
  { id: 'u2', name: 'Alan Turing', role: 'editor' },
];

export function useUsers() {
  return {
    all: () => users,
    findById: (id) => users.find((user) => user.id === id) ?? null,
  };
}
