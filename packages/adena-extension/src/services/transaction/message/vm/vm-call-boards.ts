import { createMessageOfVmCall } from './vm';

export const createMessageOfVmCreateBoard = (info: {
  address: string;
  boardName: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/boards',
    max_deposit: '',
    func: 'CreateBoard',
    args: [info.boardName],
    send: '',
  });
};

export const createMessageOfVmCreateRepost = (info: {
  address: string;
  boardId: number;
  postId: number;
  destinationBoardId: number;
  title: string;
  body: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/boards',
    max_deposit: '',
    func: 'CreateRepost',
    args: [
      `${info.boardId}`,
      `${info.postId}`,
      info.title,
      info.body,
      `${`${info.destinationBoardId}`}`,
    ],
    send: '',
  });
};

export const createMessageOfVmCreateThread = (info: {
  address: string;
  boardId: number;
  title: string;
  body: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/boards',
    max_deposit: '',
    func: 'CreateThread',
    args: [`${info.boardId}`, info.title, info.body],
    send: '',
  });
};

export const createMessageOfVmEditPost = (info: {
  address: string;
  boardId: number;
  threadId: number;
  postId: number;
  title: string;
  body: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/boards',
    max_deposit: '',
    func: 'EditPost',
    args: [`${info.boardId}`, `${info.threadId}`, `${info.postId}`, info.title, info.body],
    send: '',
  });
};

export const createMessageOfVmDeletePost = (info: {
  address: string;
  boardId: number;
  postId: number;
  reason: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/boards',
    max_deposit: '',
    func: 'DeletePost',
    args: [`${info.boardId}`, `${info.postId}`, info.reason],
    send: '',
  });
};

export const createMessageOfVmCreateReply = (info: {
  address: string;
  boardId: number;
  threadId: number;
  postId: number;
  body: string;
}): {
  type: string;
  value: { caller: string; send: string; pkg_path: string; func: string; args: string[] };
} => {
  return createMessageOfVmCall({
    caller: info.address,
    pkgPath: 'gno.land/r/boards',
    max_deposit: '',
    func: 'CreateReply',
    args: [`${info.boardId}`, `${info.threadId}`, `${info.postId}`, info.body],
    send: '',
  });
};
