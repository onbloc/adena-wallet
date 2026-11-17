package chain

import (
	"errors"
	"testing"
	"time"

	"github.com/gnolang/gno/tm2/pkg/crypto"
	"github.com/gnolang/gno/tm2/pkg/sdk/bank"
	"github.com/gnolang/gno/tm2/pkg/std"

	"github.com/onbloc/adena-wallet/misc/adena-mcp/apps/adena-mcp/internal/sessionkey"
)

func TestParseGasPrice(t *testing.T) {
	t.Parallel()

	cases := map[string]Price{
		`{"gas":"1000","price":"1ugnot"}`: {Amount: 1, Gas: 1000},
		`{"gas":500,"price":"3ugnot"}`:    {Amount: 3, Gas: 500},
		`{"gas":"0","price":"1ugnot"}`:    FloorPrice,
		`{"gas":"1000","price":"1foo"}`:   FloorPrice,
		`not json`:                        FloorPrice,
	}

	for input, want := range cases {
		if got := parseGasPrice([]byte(input)); got != want {
			t.Errorf("%s: got %+v, want %+v", input, got, want)
		}
	}
}

func TestPriceFeeRoundsUp(t *testing.T) {
	t.Parallel()

	if got := FloorPrice.Fee(1_000_001).String(); got != "1001ugnot" {
		t.Fatalf("got %s", got)
	}

	if got := FloorPrice.Fee(1).String(); got != "1ugnot" {
		t.Fatalf("a fee is never zero, got %s", got)
	}
}

func TestDecodeSessionAccount(t *testing.T) {
	t.Parallel()

	data := []byte(`{"BaseSessionAccount":{"BaseAccount":{"address":"g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5",` +
		`"coins":"","public_key":null,"account_number":"7","sequence":"3"},` +
		`"master_address":"g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5","expires_at":"1800000000",` +
		`"spend_limit":"5000000ugnot","spend_period":"0","spend_used":"10ugnot","spend_reset":"0"},` +
		`"allow_paths":["bank/send"]}`)

	acc, err := decodeSessionAccount(data)
	if err != nil {
		t.Fatal(err)
	}

	if acc.GetAccountNumber() != 7 || acc.GetSequence() != 3 || acc.GetSpendLimit().String() != "5000000ugnot" {
		t.Fatalf("unexpected account %+v", acc)
	}
}

func TestCheckSpendRejectsOverLimit(t *testing.T) {
	t.Parallel()

	master := crypto.Address{1}
	acc := &std.BaseSessionAccount{
		SpendLimit: std.NewCoins(std.NewCoin("ugnot", 100)),
		ExpiresAt:  time.Now().Add(time.Hour).Unix(),
	}
	client := NewClient()

	send := bank.MsgSend{FromAddress: master, ToAddress: crypto.Address{2}, Amount: std.NewCoins(std.NewCoin("ugnot", 90))}

	if err := client.checkSpend(acc, newTx([]std.Msg{send}, "", 1000, std.NewCoin("ugnot", 5)), master); err != nil {
		t.Fatalf("95ugnot fits in 100ugnot: %v", err)
	}

	var spendErr *SpendError

	overLimit := newTx([]std.Msg{send}, "", 1000, std.NewCoin("ugnot", 20))
	if err := client.checkSpend(acc, overLimit, master); !errors.As(err, &spendErr) {
		t.Fatalf("got %v, want SpendError", err)
	}
}

func TestMeasurementFitsASmallRemainingBudget(t *testing.T) {
	t.Parallel()

	master := crypto.Address{1}
	// 5,000ugnot left: below the 10,000ugnot a ceiling-priced fee would need.
	acc := &std.BaseSessionAccount{
		SpendLimit: std.NewCoins(std.NewCoin("ugnot", 10_000)),
		SpendUsed:  std.NewCoins(std.NewCoin("ugnot", 5_000)),
		ExpiresAt:  time.Now().Add(time.Hour).Unix(),
	}
	client := NewClient()
	call := bank.MsgSend{FromAddress: master, ToAddress: crypto.Address{2}, Amount: std.NewCoins(std.NewCoin("ugnot", 1))}

	tx := measurementTx([]std.Msg{call}, "", 10_000_000)
	if tx.Fee.GasWanted != 10_000_000 || tx.Fee.GasFee.Amount != 1 {
		t.Fatalf("unexpected measurement fee %+v", tx.Fee)
	}

	if err := client.checkSpend(acc, tx, master); err != nil {
		t.Fatalf("measurement must fit the remaining budget: %v", err)
	}

	ceilingPriced := newTx([]std.Msg{call}, "", 10_000_000, FloorPrice.Fee(10_000_000))
	if err := client.checkSpend(acc, ceilingPriced, master); err == nil {
		t.Fatal("a ceiling-priced fee should not fit, or this test proves nothing")
	}
}

func TestSignerMarksSessionSignature(t *testing.T) {
	t.Parallel()

	key, err := sessionkey.Generate()
	if err != nil {
		t.Fatal(err)
	}

	sessionAddr, err := crypto.AddressFromBech32(key.Address())
	if err != nil {
		t.Fatal(err)
	}

	acc := &std.BaseSessionAccount{}
	if setErr := acc.SetAccountNumber(4); setErr != nil {
		t.Fatal(setErr)
	}

	signer := txSigner{chainID: "dev", acc: acc, signer: key, sessionAddr: sessionAddr}
	master := crypto.Address{1}
	send := bank.MsgSend{FromAddress: master, ToAddress: crypto.Address{2}, Amount: std.NewCoins(std.NewCoin("ugnot", 1))}
	tx := newTx([]std.Msg{send}, "memo", 1000, std.NewCoin("ugnot", 1))

	signed, err := signer.sign(tx)
	if err != nil {
		t.Fatal(err)
	}

	sig := signed.Signatures[0]
	if sig.SessionAddr != sessionAddr || !sig.PubKey.Equals(key.TMPublicKey()) {
		t.Fatalf("unexpected signature %+v", sig)
	}

	signBytes, err := tx.GetSignBytes("dev", 4, 0)
	if err != nil {
		t.Fatal(err)
	}

	if !key.TMPublicKey().VerifyBytes(signBytes, sig.Signature) {
		t.Fatal("signature does not verify over the session sign bytes")
	}

	if len(tx.Signatures) != 0 {
		t.Fatal("signing must not mutate the unsigned transaction")
	}
}
