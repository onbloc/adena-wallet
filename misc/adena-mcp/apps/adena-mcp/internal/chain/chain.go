// Package chain builds, signs and broadcasts session transactions directly
// against a gno.land RPC node, without gnokey. Signing is delegated to a
// Signer, so the private key never enters this package.
package chain

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gnolang/gno/tm2/pkg/amino"
	abci "github.com/gnolang/gno/tm2/pkg/bft/abci/types"
	rpcclient "github.com/gnolang/gno/tm2/pkg/bft/rpc/client"
	"github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/crypto/secp256k1"
	"github.com/gnolang/gno/tm2/pkg/sdk/auth"
	"github.com/gnolang/gno/tm2/pkg/std"
)

// Gas sizing follows gno-mcp: measure at a ceiling, reserve 1.5x the gas used,
// and price the fee for the gas reserved, because the chain charges the whole
// offered fee against the session spend limit.
const (
	minGasWanted = 100_000
	// The genesis floor is 1ugnot per 1000 gas.
	floorPriceAmount = 1
	floorPriceGas    = 1000
	gasDenom         = "ugnot"
	simulatePath     = ".app/simulate"
)

// The tm2 HTTP client has no timeout of its own, and a stalled node would
// otherwise hold the session lock indefinitely.
var (
	queryTimeout   = 30 * time.Second
	executeTimeout = 2 * time.Minute
)

// ErrSessionNotFound means the chain holds no such session: it was revoked,
// expired, or never created.
var ErrSessionNotFound = errors.New("session not found on chain")

var gasPricePattern = regexp.MustCompile(`^(\d+)ugnot$`)

// Signer signs with a session key it does not expose.
type Signer interface {
	Sign(msg []byte) ([]byte, error)
	TMPublicKey() secp256k1.PubKeySecp256k1
	Address() string
}

// Price is a gas price of Amount ugnot per Gas units.
type Price struct {
	Amount int64
	Gas    int64
}

// FloorPrice is the genesis minimum gas price.
var FloorPrice = Price{Amount: floorPriceAmount, Gas: floorPriceGas}

// Fee returns the fee for gasWanted, rounded up.
func (p Price) Fee(gasWanted int64) std.Coin {
	return std.NewCoin(gasDenom, max((gasWanted*p.Amount+p.Gas-1)/p.Gas, 1))
}

// Mode selects what Execute does with the signed transaction.
type Mode int

// Execution modes.
const (
	Broadcast Mode = iota
	Simulate
	SignOnly
)

// TxRequest describes one session-signed transaction.
type TxRequest struct {
	Signer Signer
	// Msgs builds the messages with the master address as the caller.
	Msgs    func(master crypto.Address) ([]std.Msg, error)
	RPCURL  string
	ChainID string
	Master  string
	Memo    string
	// GasFee overrides the fee priced from the chain gas price.
	GasFee string
	// GasWanted skips measurement when set.
	GasWanted int64
	// GasCeiling is the gas limit used to measure the transaction.
	GasCeiling int64
	Mode       Mode
}

// TxResult is the outcome of a broadcast, simulation or signature.
type TxResult struct {
	TxHash string
	GasFee string
	Data   string
	// SignedTx is the amino-encoded signed transaction (SignOnly).
	SignedTx  []byte
	Height    int64
	GasWanted int64
	GasUsed   int64
	Simulated bool
}

// Client talks to gno.land RPC nodes. It serializes transactions per session
// so concurrent writes do not reuse a sequence number.
type Client struct {
	clients map[string]*rpcclient.RPCClient
	locks   map[string]*sync.Mutex
	now     func() time.Time
	mu      sync.Mutex
}

// NewClient returns a Client.
func NewClient() *Client {
	return &Client{
		clients: make(map[string]*rpcclient.RPCClient),
		locks:   make(map[string]*sync.Mutex),
		now:     time.Now,
	}
}

func (c *Client) rpc(rpcURL string) (*rpcclient.RPCClient, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if cli, ok := c.clients[rpcURL]; ok {
		return cli, nil
	}

	rpc, err := rpcclient.NewHTTPClient(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("connect to %s: %w", rpcURL, err)
	}

	c.clients[rpcURL] = rpc

	return rpc, nil
}

func (c *Client) sessionLock(address string) *sync.Mutex {
	c.mu.Lock()
	defer c.mu.Unlock()

	lock, ok := c.locks[address]
	if !ok {
		lock = &sync.Mutex{}
		c.locks[address] = lock
	}

	return lock
}

func (c *Client) query(ctx context.Context, rpcURL, path string) ([]byte, error) {
	cli, err := c.rpc(rpcURL)
	if err != nil {
		return nil, err
	}

	res, err := cli.ABCIQuery(ctx, path, nil)
	if err != nil {
		return nil, fmt.Errorf("query %s: %w", path, err)
	}

	if res.Response.Error != nil {
		return nil, fmt.Errorf("query %s: %w: %s", path, res.Response.Error, res.Response.Log)
	}

	return res.Response.Data, nil
}

// GasPrice reads the chain gas price, falling back to the genesis floor.
func (c *Client) GasPrice(ctx context.Context, rpcURL string) Price {
	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	data, err := c.query(ctx, rpcURL, "auth/gasprice")
	if err != nil {
		return FloorPrice
	}

	return parseGasPrice(data)
}

func parseGasPrice(data []byte) Price {
	var raw struct {
		Price string          `json:"price"`
		Gas   json.RawMessage `json:"gas"`
	}

	if json.Unmarshal(data, &raw) != nil {
		return FloorPrice
	}

	gas, gasErr := strconv.ParseInt(strings.Trim(string(raw.Gas), `"`), 10, 64)
	match := gasPricePattern.FindStringSubmatch(raw.Price)

	if gasErr != nil || gas <= 0 || match == nil {
		return FloorPrice
	}

	amount, err := strconv.ParseInt(match[1], 10, 64)
	if err != nil || amount <= 0 {
		return FloorPrice
	}

	return Price{Amount: amount, Gas: gas}
}

// SessionAccount returns the chain's record of a session.
func (c *Client) SessionAccount(ctx context.Context, rpcURL, master, session string) (*std.BaseSessionAccount, error) {
	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	data, err := c.query(ctx, rpcURL, fmt.Sprintf("auth/accounts/%s/session/%s", master, session))
	if err != nil {
		if strings.Contains(err.Error(), "session not found") {
			return nil, ErrSessionNotFound
		}

		return nil, err
	}

	if len(data) == 0 || string(data) == "null" {
		return nil, ErrSessionNotFound
	}

	return decodeSessionAccount(data)
}

// decodeSessionAccount parses the amino JSON session record. The embedded
// BaseSessionAccount appears under its own key, so it is decoded through a
// wire struct as gnokey does.
func decodeSessionAccount(data []byte) (*std.BaseSessionAccount, error) {
	var wire struct {
		AllowPaths         []string `json:"allow_paths,omitempty"`
		BaseSessionAccount std.BaseSessionAccount
	}

	if err := amino.UnmarshalJSON(data, &wire); err != nil {
		return nil, fmt.Errorf("decode session account: %w", err)
	}

	return &wire.BaseSessionAccount, nil
}

// Execute measures, signs and broadcasts (or only simulates) the request.
func (c *Client) Execute(ctx context.Context, req TxRequest) (TxResult, error) {
	ctx, cancel := context.WithTimeout(ctx, executeTimeout)
	defer cancel()

	lock := c.sessionLock(req.Signer.Address())
	lock.Lock()
	defer lock.Unlock()

	cli, err := c.rpc(req.RPCURL)
	if err != nil {
		return TxResult{}, err
	}

	master, err := crypto.AddressFromBech32(req.Master)
	if err != nil {
		return TxResult{}, fmt.Errorf("master address: %w", err)
	}

	sessionAddr, err := crypto.AddressFromBech32(req.Signer.Address())
	if err != nil {
		return TxResult{}, fmt.Errorf("session address: %w", err)
	}

	msgs, err := req.Msgs(master)
	if err != nil {
		return TxResult{}, err
	}

	if len(msgs) == 0 {
		return TxResult{}, errors.New("at least one message is required")
	}

	for i, msg := range msgs {
		if validateErr := msg.ValidateBasic(); validateErr != nil {
			return TxResult{}, fmt.Errorf("invalid message %d: %w", i, validateErr)
		}
	}

	acc, err := c.SessionAccount(ctx, req.RPCURL, req.Master, req.Signer.Address())
	if err != nil {
		return TxResult{}, err
	}

	signer := txSigner{chainID: req.ChainID, acc: acc, signer: req.Signer, sessionAddr: sessionAddr}
	price := c.GasPrice(ctx, req.RPCURL)

	gasWanted, measured, err := c.measure(ctx, cli, &signer, req, msgs, master)
	if err != nil {
		return TxResult{}, err
	}

	fee := price.Fee(gasWanted)

	if req.GasFee != "" {
		fee, err = std.ParseCoin(req.GasFee)
		if err != nil {
			return TxResult{}, fmt.Errorf("gas fee: %w", err)
		}
	}

	tx := newTx(msgs, req.Memo, gasWanted, fee)
	if spendErr := c.checkSpend(acc, tx, master); spendErr != nil {
		return TxResult{}, spendErr
	}

	if req.Mode == Simulate {
		return c.simulateFinal(ctx, cli, &signer, tx, measured)
	}

	signed, err := signer.sign(tx)
	if err != nil {
		return TxResult{}, err
	}

	if req.Mode == SignOnly {
		bz, marshalErr := amino.Marshal(signed)
		if marshalErr != nil {
			return TxResult{}, fmt.Errorf("encode signed tx: %w", marshalErr)
		}

		return TxResult{SignedTx: bz, GasWanted: gasWanted, GasFee: fee.String()}, nil
	}

	res, err := broadcast(ctx, cli, signed)
	if err != nil {
		return TxResult{}, err
	}

	return TxResult{
		TxHash:    base64.StdEncoding.EncodeToString(res.Hash),
		Height:    res.Height,
		GasWanted: gasWanted,
		GasUsed:   res.GasUsed,
		GasFee:    fee.String(),
		Data:      string(res.Data),
	}, nil
}

type measurement struct {
	data    string
	gasUsed int64
}

// measure returns the gas limit to use, simulating at the ceiling when the
// caller did not set one.
func (c *Client) measure(
	ctx context.Context,
	cli *rpcclient.RPCClient,
	signer *txSigner,
	req TxRequest,
	msgs []std.Msg,
	master crypto.Address,
) (int64, *measurement, error) {
	if req.GasWanted > 0 {
		return req.GasWanted, nil, nil
	}

	tx := measurementTx(msgs, req.Memo, req.GasCeiling)
	if err := c.checkSpend(signer.acc, tx, master); err != nil {
		return 0, nil, err
	}

	signed, err := signer.sign(tx)
	if err != nil {
		return 0, nil, err
	}

	deliver, err := simulate(ctx, cli, signed)
	if err != nil {
		return 0, nil, err
	}

	return max(deliver.GasUsed*3/2, minGasWanted), &measurement{gasUsed: deliver.GasUsed, data: string(deliver.Data)}, nil
}

// measurementTx simulates at the gas ceiling with the smallest fee. The chain
// skips the minimum fee check when simulating but still charges the fee to the
// session budget, so a ceiling-priced fee would refuse sessions that can afford
// the real transaction. Execute checks the real fee before signing.
func measurementTx(msgs []std.Msg, memo string, gasCeiling int64) *std.Tx {
	return newTx(msgs, memo, gasCeiling, std.NewCoin(gasDenom, 1))
}

func (c *Client) simulateFinal(
	ctx context.Context,
	cli *rpcclient.RPCClient,
	signer *txSigner,
	tx *std.Tx,
	measured *measurement,
) (TxResult, error) {
	result := TxResult{Simulated: true, GasWanted: tx.Fee.GasWanted, GasFee: tx.Fee.GasFee.String()}

	if measured != nil {
		result.GasUsed = measured.gasUsed
		result.Data = measured.data

		return result, nil
	}

	signed, err := signer.sign(tx)
	if err != nil {
		return TxResult{}, err
	}

	deliver, err := simulate(ctx, cli, signed)
	if err != nil {
		return TxResult{}, err
	}

	result.GasUsed = deliver.GasUsed
	result.Data = string(deliver.Data)

	return result, nil
}

// checkSpend runs the chain's own spend check before broadcast, so an
// over-limit transaction fails with numbers instead of a bare rejection.
func (c *Client) checkSpend(acc *std.BaseSessionAccount, tx *std.Tx, master crypto.Address) error {
	total := std.Coins{}
	if !tx.Fee.GasFee.IsZero() {
		total = total.Add(std.Coins{tx.Fee.GasFee})
	}

	for _, msg := range tx.GetMsgs() {
		if estimator, ok := msg.(std.SpendEstimator); ok {
			total = total.Add(estimator.SpendForSigner(master))
		}
	}

	if err := auth.CheckSessionSpend(acc, total, c.now().Unix()); err != nil {
		return &SpendError{Outflow: total.String(), Limit: acc.GetSpendLimit().String(), Used: acc.GetSpendUsed().String()}
	}

	return nil
}

// SpendError means the transaction would exceed the session spend limit.
type SpendError struct {
	Outflow string
	Limit   string
	Used    string
}

func (e *SpendError) Error() string {
	return fmt.Sprintf("outflow %s (gas fee + send) exceeds the session spend limit %s (used %s)",
		e.Outflow, e.Limit, e.Used)
}

// TxError is a transaction the node rejected or that failed to execute.
type TxError struct {
	Err   error
	Stage string
	Log   string
}

func (e *TxError) Error() string {
	return fmt.Sprintf("%s failed: %v: %s", e.Stage, e.Err, strings.TrimSpace(e.Log))
}

func (e *TxError) Unwrap() error { return e.Err }

func simulate(ctx context.Context, cli *rpcclient.RPCClient, tx *std.Tx) (*abci.ResponseDeliverTx, error) {
	bz, err := amino.Marshal(tx)
	if err != nil {
		return nil, fmt.Errorf("encode tx: %w", err)
	}

	res, err := cli.ABCIQuery(ctx, simulatePath, bz)
	if err != nil {
		return nil, fmt.Errorf("simulate: %w", err)
	}

	if res.Response.Error != nil {
		return nil, &TxError{Stage: "simulation", Err: res.Response.Error, Log: res.Response.Log}
	}

	deliver := new(abci.ResponseDeliverTx)
	if err := amino.Unmarshal(res.Response.Value, deliver); err != nil {
		return nil, fmt.Errorf("decode simulation: %w", err)
	}

	if deliver.Error != nil {
		return nil, &TxError{Stage: "simulation", Err: deliver.Error, Log: deliver.Log}
	}

	return deliver, nil
}

type broadcastResult struct {
	Data    []byte
	Hash    []byte
	Height  int64
	GasUsed int64
}

func broadcast(ctx context.Context, cli *rpcclient.RPCClient, tx *std.Tx) (broadcastResult, error) {
	bz, err := amino.Marshal(tx)
	if err != nil {
		return broadcastResult{}, fmt.Errorf("encode tx: %w", err)
	}

	res, err := cli.BroadcastTxCommit(ctx, bz)
	if err != nil {
		return broadcastResult{}, fmt.Errorf("broadcast: %w", err)
	}

	if res.CheckTx.IsErr() {
		return broadcastResult{}, &TxError{Stage: "check", Err: res.CheckTx.Error, Log: res.CheckTx.Log}
	}

	if res.DeliverTx.IsErr() {
		return broadcastResult{}, &TxError{Stage: "delivery", Err: res.DeliverTx.Error, Log: res.DeliverTx.Log}
	}

	return broadcastResult{
		Hash:    res.Hash,
		Height:  res.Height,
		GasUsed: res.DeliverTx.GasUsed,
		Data:    res.DeliverTx.Data,
	}, nil
}

func newTx(msgs []std.Msg, memo string, gasWanted int64, fee std.Coin) *std.Tx {
	return &std.Tx{Msgs: msgs, Fee: std.NewFee(gasWanted, fee), Memo: memo}
}

type txSigner struct {
	signer      Signer
	acc         *std.BaseSessionAccount
	chainID     string
	sessionAddr crypto.Address
}

// sign signs with the session's own account number and sequence and marks
// the signature with the session address, as the ante handler expects.
func (s *txSigner) sign(tx *std.Tx) (*std.Tx, error) {
	signBytes, err := tx.GetSignBytes(s.chainID, s.acc.GetAccountNumber(), s.acc.GetSequence())
	if err != nil {
		return nil, fmt.Errorf("sign bytes: %w", err)
	}

	sig, err := s.signer.Sign(signBytes)
	if err != nil {
		return nil, err
	}

	signed := *tx
	signed.Signatures = []std.Signature{{
		PubKey:      s.signer.TMPublicKey(),
		Signature:   sig,
		SessionAddr: s.sessionAddr,
	}}

	return &signed, nil
}
